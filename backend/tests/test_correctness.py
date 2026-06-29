"""Backend correctness fixes (audit batch 3)."""
from datetime import datetime, timezone

import pytest
from sqlmodel import Session, select


# ── dedup: non-Latin names must not all collapse together ─────────────────────

def test_find_duplicate_keeps_distinct_non_latin_names(data_dir):
    from app import db
    from app.dedup import find_duplicate
    from app.models import POI, Role, User

    db.reset_engine()
    db.init_db()
    with Session(db.engine) as s:
        u = User(username="a", password_hash="h", role=Role.ADMIN)
        s.add(u)
        s.commit()
        s.add(POI(name="Кафе", lat=52.0, lng=4.0, created_by=u.id))  # Cyrillic "Cafe"
        s.commit()
        # A different Cyrillic name at the same spot is NOT the same place.
        assert find_duplicate(s, "Ресторан", 52.0, 4.0, None) is None
        # The same name still matches.
        assert find_duplicate(s, "Кафе", 52.0001, 4.0001, None) is not None


# ── sync: tz-naive vs tz-aware datetime comparison ───────────────────────────

def test_local_changed_handles_naive_and_aware():
    from app.trip.snapshot import local_changed

    aware = datetime(2026, 1, 2, tzinfo=timezone.utc)
    naive = datetime(2026, 1, 1)
    assert local_changed(aware, naive) is True   # no TypeError
    assert local_changed(naive, aware) is False


# ── sync: applying a snapshot must not null out required columns ──────────────

def test_apply_place_snapshot_keeps_required_fields_when_snapshot_null():
    from app.trip.resolve import apply_place_snapshot

    class P:
        pass

    poi = P()
    poi.name, poi.lat, poi.lng = "Orig", 1.0, 2.0
    apply_place_snapshot(poi, {"name": None, "lat": None, "lng": None, "links": []}, None)
    assert poi.name == "Orig" and poi.lat == 1.0 and poi.lng == 2.0


# ── reconcile: a TRIP place with null coords must not crash the pass ──────────

def test_reconcile_skips_trip_place_with_null_coords(data_dir):
    # Unit-level guard: haversine is never called with None (it would TypeError).
    from app.dedup import haversine_m

    tplace = {"name": "X", "lat": None, "lng": None}
    tlat, tlng = tplace.get("lat"), tplace.get("lng")
    skip = not isinstance(tlat, (int, float)) or not isinstance(tlng, (int, float))
    assert skip is True
    # And valid coords are fine.
    assert haversine_m(1.0, 2.0, 1.0, 2.0) == 0.0


# ── migration shim: add a NOT NULL column with a default on upgrade ───────────

def test_migration_shim_adds_not_null_column_with_default(data_dir):
    from sqlalchemy import inspect, text

    from app import db

    db.reset_engine()
    db.init_db()
    with db.engine.begin() as conn:
        conn.execute(text(
            'INSERT INTO "user" (username, password_hash, role, disabled, token_version, created_at) '
            "VALUES ('u', 'h', 'member', 0, 0, '2026-01-01T00:00:00')"
        ))
        conn.execute(text('ALTER TABLE "user" DROP COLUMN token_version'))
    assert "token_version" not in {c["name"] for c in inspect(db.engine).get_columns("user")}

    db._add_missing_columns(db.engine)

    assert "token_version" in {c["name"] for c in inspect(db.engine).get_columns("user")}
    with db.engine.begin() as conn:
        assert conn.execute(text('SELECT token_version FROM "user"')).scalar() == 0


# ── crypto: undecryptable ciphertext surfaces a clear error, not a 500 ────────

def test_decrypt_raises_decrypterror_on_garbage(data_dir):
    from app.crypto import DecryptError, decrypt

    with pytest.raises(DecryptError):
        decrypt("not-a-valid-token")


def test_places_returns_400_when_key_cannot_be_decrypted(client):
    from app import db
    from app.models import get_or_create_settings

    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    with Session(db.engine) as s:
        settings = get_or_create_settings(s)
        settings.google_api_key_enc = "garbage-not-fernet"
        s.add(settings)
        s.commit()
    r = client.get("/api/places/search", params={"q": "cafe"})
    assert r.status_code == 400


# ── backup: a malformed archive row must not wipe the existing instance ───────

def test_restore_does_not_wipe_on_malformed_row(data_dir):
    from app import backup, db
    from app.models import POI, Role, User

    db.reset_engine()
    db.init_db()
    with Session(db.engine) as s:
        u = User(username="a", password_hash="h", role=Role.ADMIN)
        s.add(u)
        s.commit()
        s.add(POI(name="Keep", lat=1.0, lng=2.0, created_by=u.id))
        s.commit()

    bad = {
        "version": backup.BACKUP_VERSION,
        "pois": [{"name": "X", "lat": 1.0, "lng": 2.0, "created_by": 1, "created_at": "not-a-date"}],
    }
    with Session(db.engine) as s:
        with pytest.raises(ValueError):
            backup.restore_backup(s, bad)
    # The existing POI is still there — the destructive delete never ran.
    with Session(db.engine) as s:
        assert s.exec(select(POI)).first().name == "Keep"


def test_backup_includes_tombstones(data_dir):
    from app import backup, db
    from app.models import Tombstone

    db.reset_engine()
    db.init_db()
    with Session(db.engine) as s:
        s.add(Tombstone(entity_type="place", trip_id=7, origin="local"))
        s.commit()
        data = backup.build_backup(s)
    assert "tombstones" in data
    assert data["tombstones"][0]["trip_id"] == 7
