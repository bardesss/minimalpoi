"""Full backup / restore of all MinimalPOI data as a single ZIP archive.

Distinct from the GeoJSON places export: this captures *every* domain table
(users, teams, categories, places, visits, comments, settings) plus the image
files, with ids preserved so foreign keys stay consistent on restore. Restore
is a v1 "rebuild a fresh instance" operation — it clears the target tables and
loads the archive, and is only allowed into an empty instance.

Secrets (password hashes, encrypted TRIP/Google credentials) are included so a
same-host restore is complete; the encrypted settings only decrypt if
`data/secret.key` is the same key (copy the volume's key, or re-enter the
credentials after a cross-host restore).
"""
from __future__ import annotations

import enum
import io
import json
import typing
import zipfile
from datetime import datetime
from pathlib import Path

from sqlmodel import Session, select

from .enrich.images import images_dir
from .models import POI, Category, Comment, Settings, Team, TeamMember, Tombstone, User, Visit, utcnow

BACKUP_VERSION = 1

# (json key, model) in foreign-key-safe insert order. Reverse for deletes.
# Tombstones are included so a restored instance doesn't re-import TRIP items it
# had previously deleted.
_TABLES = [
    ("users", User),
    ("teams", Team),
    ("team_members", TeamMember),
    ("categories", Category),
    ("pois", POI),
    ("visits", Visit),
    ("comments", Comment),
    ("tombstones", Tombstone),
]


def build_backup(session: Session) -> dict:
    """Serialize all data to a JSON-safe dict with ids preserved."""
    data: dict = {"version": BACKUP_VERSION, "exported_at": utcnow().isoformat()}
    for key, model in _TABLES:
        data[key] = [row.model_dump(mode="json") for row in session.exec(select(model)).all()]
    settings_row = session.get(Settings, 1)
    data["settings"] = settings_row.model_dump(mode="json") if settings_row else None
    return data


def _coerce(annotation, value):
    """Parse JSON-decoded primitives back into the model's field types. Table
    models (SQLModel table=True) skip pydantic validation on construction, so
    ISO datetime strings / enum values would otherwise reach SQLite as raw
    strings and be rejected."""
    if not isinstance(value, str):
        return value
    args = typing.get_args(annotation)
    candidates = [a for a in args if a is not type(None)] if args else [annotation]
    for t in candidates:
        if isinstance(t, type) and issubclass(t, datetime):
            return datetime.fromisoformat(value)
        if isinstance(t, type) and issubclass(t, enum.Enum):
            return t(value)
    return value


def _build_row(model, d: dict):
    fields = model.model_fields
    return model(**{k: _coerce(fields[k].annotation, v) if k in fields else v for k, v in d.items()})


def is_empty(session: Session) -> bool:
    """A fresh instance has no user-created places or categories yet (the
    bootstrap admin user is allowed to exist)."""
    return (
        session.exec(select(POI)).first() is None
        and session.exec(select(Category)).first() is None
    )


def restore_backup(session: Session, data: dict) -> dict[str, int]:
    """Clear the target tables and load rows from `data`, preserving ids.

    Raises ValueError on an unsupported version. Replaces the bootstrap
    instance wholesale (including its users + settings).
    """
    version = data.get("version")
    if version != BACKUP_VERSION:
        raise ValueError(f"unsupported backup version: {version}")

    # Build and validate every row from the (untrusted) archive FIRST. If any row
    # is malformed (bad datetime/enum, etc.) this raises before we touch existing
    # data, so a corrupt backup can never leave the instance wiped.
    built: dict[str, list] = {key: [_build_row(model, d) for d in (data.get(key) or [])] for key, model in _TABLES}
    settings_obj = _build_row(Settings, data["settings"]) if data.get("settings") else None

    # Now clear and insert in a single transaction (one commit); a failure here
    # rolls back the deletes too.
    for _key, model in reversed(_TABLES):
        for row in session.exec(select(model)).all():
            session.delete(row)
    for row in session.exec(select(Settings)).all():
        session.delete(row)

    counts: dict[str, int] = {}
    for key, _model in _TABLES:
        for obj in built[key]:
            session.add(obj)
        counts[key] = len(built[key])
    if settings_obj is not None:
        session.add(settings_obj)
    session.commit()
    return counts


def build_backup_archive(session: Session) -> bytes:
    """A ZIP with backup.json + every referenced local image file."""
    data = build_backup(session)
    img_dir = images_dir()
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("backup.json", json.dumps(data))
        for poi in data["pois"]:
            url = poi.get("image_url")
            if url and url.startswith("/images/"):
                name = Path(url[len("/images/") :]).name
                src = img_dir / name
                if src.is_file():
                    z.write(src, f"images/{name}")
    return buf.getvalue()


def restore_from_archive(session: Session, raw: bytes) -> dict[str, int]:
    """Load a ZIP produced by build_backup_archive: restore the data, then
    write the image files back under the images dir."""
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        data = json.loads(z.read("backup.json"))
        summary = restore_backup(session, data)
        img_dir = images_dir()
        for member in z.namelist():
            if member.startswith("images/") and not member.endswith("/"):
                target = img_dir / Path(member).name  # flatten; ignore any path tricks
                target.write_bytes(z.read(member))
    return summary
