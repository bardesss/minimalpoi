"""Full backup / restore of all MinimalPOI data as a single ZIP archive.

Distinct from the GeoJSON places export: this captures *every* domain table
(users, teams, categories, places, visits, comments, routes with their nodes,
legs, attachments and shares, settings) plus the image and route-attachment
files, with ids preserved so foreign keys stay consistent on restore. Restore
is a "rebuild a fresh instance" operation — it clears the target tables and
loads the archive, and is only allowed into an empty instance (see is_empty).

API tokens are never backed up. Restore replaces the users, so every existing
token is deleted rather than left pointing at whichever restored user ends up
with the same id. A v1 archive (pre-routes) still restores; the route tables
are cleared and left empty.

Secrets (password hashes, the encrypted Google credential) are included so a
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
from datetime import date, datetime
from pathlib import Path

from sqlalchemy import func
from sqlmodel import Session, select

from . import attachments
from .db import (
    dedupe_role_rows,
    log_username_collisions,
    null_dangling_ref_rows,
    plan_username_lowercasing,
    reset_pg_sequences,
)
from .enrich.images import UnsupportedImageError, images_dir, process_image
from .models import (
    POI,
    SYSTEM_USERNAMES,
    ApiToken,
    Category,
    Comment,
    Route,
    RouteAttachment,
    RouteLeg,
    RouteNode,
    RouteShare,
    Settings,
    Team,
    TeamMember,
    User,
    Visit,
    as_utc,
    utcnow,
)

BACKUP_VERSION = 2
SUPPORTED_VERSIONS = {1, 2}

# Restore-time guards: a total decompressed budget (zip-bomb) and an image
# extension allowlist. Restored image bytes are re-encoded through process_image
# so a crafted archive can't drop e.g. evil.html/.svg into the public /images dir.
ZIP_MAX_TOTAL_BYTES = 500 * 1024 * 1024
_IMAGE_EXTS = {".webp", ".jpg", ".jpeg", ".png"}
# Route attachments can't be re-encoded (PDFs), so each file must instead have
# an allowed extension, pass the magic-byte sniff, fit the upload size cap and
# be referenced by a restored RouteAttachment row. They are written to the
# private attachments dir, never the public /images dir.
_ATTACHMENT_EXTS = set(attachments.ALLOWED.values())

# (json key, model) in foreign-key-safe insert order. Reverse for deletes.
_TABLES = [
    ("users", User),
    ("teams", Team),
    ("team_members", TeamMember),
    ("categories", Category),
    ("pois", POI),
    ("visits", Visit),
    ("comments", Comment),
    ("routes", Route),
    ("route_nodes", RouteNode),
    ("route_legs", RouteLeg),
    ("route_attachments", RouteAttachment),
    ("route_shares", RouteShare),
]

# The sections a v1 (pre-routes) archive carries. Restoring one loads only
# these and leaves the route tables cleared.
_V1_KEYS = {"users", "teams", "team_members", "categories", "pois", "visits", "comments"}


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
    ISO date/datetime strings / enum values would otherwise reach the database
    as raw strings and be rejected."""
    if not isinstance(value, str):
        return value
    args = typing.get_args(annotation)
    candidates = [a for a in args if a is not type(None)] if args else [annotation]
    for t in candidates:
        # datetime first: it is a subclass of date.
        if isinstance(t, type) and issubclass(t, datetime):
            return as_utc(datetime.fromisoformat(value))
        if isinstance(t, type) and issubclass(t, date):
            return date.fromisoformat(value)
        if isinstance(t, type) and issubclass(t, enum.Enum):
            return t(value)
    return value


def _build_row(model, d: dict):
    # Keys the model no longer defines (a pre-v4 archive's trip_* columns, say)
    # are accepted and ignored: SQLModel's table models skip validation and
    # never set an unmapped attribute. Older archives therefore still restore —
    # test_restore_ignores_fields_removed_from_the_model pins that.
    fields = model.model_fields
    return model(**{k: _coerce(fields[k].annotation, v) if k in fields else v for k, v in d.items()})


def is_empty(session: Session) -> bool:
    """A fresh instance: no rows in any backed-up table other than users, no
    API tokens, and at most one non-system user (the bootstrap admin)."""
    for _key, model in _TABLES:
        if model is not User and session.exec(select(model)).first() is not None:
            return False
    if session.exec(select(ApiToken)).first() is not None:
        return False
    real_users = session.exec(
        select(func.count()).select_from(User).where(User.username.not_in(SYSTEM_USERNAMES))
    ).one()
    return real_users <= 1


def _normalise_rows(rows: dict[str, list[dict]]) -> None:
    """Apply the boot-time pre-steps (db.init_db) to archive rows before they are
    inserted, since restore happens after boot: lower-case usernames, clear the
    role on duplicate start/end nodes, and null dangling team/POI references
    (Postgres enforces the foreign keys an old SQLite backup may violate)."""
    renames, collisions = plan_username_lowercasing([u["username"] for u in rows["users"]])
    log_username_collisions(collisions)
    for user in rows["users"]:
        user["username"] = renames.get(user["username"], user["username"])
    dedupe_role_rows(rows["route_nodes"])
    null_dangling_ref_rows({model.__tablename__: rows[key] for key, model in _TABLES})


def restore_backup(session: Session, data: dict) -> dict[str, int]:
    """Clear the target tables and load rows from `data`, preserving ids.

    Raises ValueError on an unsupported version. Replaces the bootstrap
    instance wholesale (including its users + settings) and deletes every
    API token.
    """
    version = data.get("version")
    if version not in SUPPORTED_VERSIONS:
        raise ValueError(f"unsupported backup version: {version}")
    keys = _V1_KEYS if version == 1 else {key for key, _model in _TABLES}

    # Build and validate every row from the (untrusted) archive FIRST. If any row
    # is malformed (bad datetime/enum, etc.) this raises before we touch existing
    # data, so a corrupt backup can never leave the instance wiped.
    rows: dict[str, list[dict]] = {
        key: [dict(d) for d in (data.get(key) or [])] if key in keys else [] for key, _model in _TABLES
    }
    _normalise_rows(rows)
    built: dict[str, list] = {key: [_build_row(model, d) for d in rows[key]] for key, model in _TABLES}
    settings_obj = _build_row(Settings, data["settings"]) if data.get("settings") else None

    # Now clear and insert in a single transaction (one commit); a failure here
    # rolls back the deletes too. Flush per table: the ORM doesn't order
    # statements between mappers that have no relationship(), and Postgres
    # enforces the foreign keys. Tokens go first because the users are replaced.
    for model in (ApiToken, *(m for _key, m in reversed(_TABLES)), Settings):
        for row in session.exec(select(model)).all():
            session.delete(row)
        session.flush()

    counts: dict[str, int] = {}
    for key, _model in _TABLES:
        for obj in built[key]:
            session.add(obj)
        session.flush()
        counts[key] = len(built[key])
    if settings_obj is not None:
        session.add(settings_obj)
    session.commit()
    # Rows went in with explicit ids; move Postgres sequences past them.
    reset_pg_sequences(session.get_bind())
    return counts


def build_backup_archive(session: Session) -> bytes:
    """A ZIP with backup.json + every referenced local image and route
    attachment file."""
    data = build_backup(session)
    img_dir = images_dir()
    att_dir = attachments.attachments_dir()
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
        for att in data["route_attachments"]:
            name = Path(att["stored_filename"]).name
            src = att_dir / name
            if src.is_file():
                z.write(src, f"route_attachments/{name}")
    return buf.getvalue()


def _restore_attachment_files(z: zipfile.ZipFile, data: dict) -> None:
    """Write route attachment files back, but only ones a restored
    RouteAttachment row references, with an allowed extension, within the
    upload size cap and passing the magic-byte sniff."""
    if data.get("version") == 1:
        return
    referenced = {Path(d.get("stored_filename") or "").name for d in (data.get("route_attachments") or [])}
    att_dir = attachments.attachments_dir()
    for info in z.infolist():
        member = info.filename
        if not member.startswith("route_attachments/") or member.endswith("/"):
            continue
        name = Path(member).name  # flatten; ignore any path tricks
        if not name or name not in referenced or Path(name).suffix.lower() not in _ATTACHMENT_EXTS:
            continue
        if info.file_size > attachments.MAX_ATTACHMENT_BYTES:
            continue
        payload = z.read(member)
        if len(payload) > attachments.MAX_ATTACHMENT_BYTES or attachments.sniff(payload) is None:
            continue  # not an allowed file type — skip
        (att_dir / name).write_bytes(payload)


def restore_from_archive(session: Session, raw: bytes) -> dict[str, int]:
    """Load a ZIP produced by build_backup_archive: restore the data, then
    write the image and route attachment files back."""
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        if sum(info.file_size for info in z.infolist()) > ZIP_MAX_TOTAL_BYTES:
            raise ValueError("backup archive is too large to restore")
        data = json.loads(z.read("backup.json"))
        summary = restore_backup(session, data)
        img_dir = images_dir()
        for member in z.namelist():
            if not member.startswith("images/") or member.endswith("/"):
                continue
            name = Path(member).name  # flatten; ignore any path tricks
            if Path(name).suffix.lower() not in _IMAGE_EXTS:
                continue  # not an image extension — never write it to the public dir
            try:
                safe = process_image(z.read(member))  # re-encode; strips any payload
            except UnsupportedImageError:
                continue  # not a real image — skip
            (img_dir / name).write_bytes(safe)
        _restore_attachment_files(z, data)
    return summary
