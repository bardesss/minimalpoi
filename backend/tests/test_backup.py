import io
import zipfile

import pytest
from sqlmodel import Session, select


def _session():
    from app import db

    return Session(db.engine)


def _seed(session):
    from app.models import Category, Comment, POI, Role, Team, TeamMember, User, Visit, get_or_create_settings

    admin = User(username="admin", password_hash="h1", role=Role.ADMIN)
    bob = User(username="bob", password_hash="h2", role=Role.MEMBER)
    session.add(admin)
    session.add(bob)
    session.commit()
    team = Team(name="Crew", created_by=admin.id)
    session.add(team)
    session.commit()
    session.add(TeamMember(team_id=team.id, user_id=admin.id))
    cat = Category(name="Food", created_by=admin.id)
    session.add(cat)
    session.commit()
    poi = POI(name="Cafe", lat=52.0, lng=4.0, category_id=cat.id, created_by=admin.id, image_url="/images/pic.webp", tags=["x", "y"])
    session.add(poi)
    session.commit()
    session.add(Visit(poi_id=poi.id, user_id=admin.id, rating=5))
    session.add(Comment(poi_id=poi.id, user_id=bob.id, text="nice"))
    s = get_or_create_settings(session)
    s.map_tile_url = "https://t.example/s.json"
    s.google_api_key_enc = "ENC"
    session.add(s)
    session.commit()
    return {"poi_id": poi.id, "cat_id": cat.id, "admin_id": admin.id, "bob_id": bob.id}


def test_build_and_restore_round_trip(data_dir):
    from app import backup, db
    from app.models import Category, Comment, POI, Settings, User, Visit

    db.reset_engine()
    db.init_db()
    with _session() as s:
        ids = _seed(s)
        data = backup.build_backup(s)

    assert data["version"] == backup.BACKUP_VERSION
    assert {u["username"] for u in data["users"]} == {"admin", "bob"}
    assert data["pois"][0]["image_url"] == "/images/pic.webp"
    assert data["settings"]["google_api_key_enc"] == "ENC"

    # Wipe everything, prove it's gone, then restore from the captured dict.
    with _session() as s:
        for model in (Comment, Visit, POI, Category, User):
            for row in s.exec(select(model)).all():
                s.delete(row)
        for row in s.exec(select(Settings)).all():
            s.delete(row)
        s.commit()
    with _session() as s:
        assert s.exec(select(POI)).first() is None
        summary = backup.restore_backup(s, data)
    assert summary["pois"] == 1

    with _session() as s:
        poi = s.get(POI, ids["poi_id"])
        assert poi is not None and poi.name == "Cafe" and poi.tags == ["x", "y"]
        assert poi.category_id == ids["cat_id"]  # FK ids preserved
        assert {u.username for u in s.exec(select(User)).all()} == {"admin", "bob"}
        assert s.exec(select(Visit)).first().rating == 5
        assert s.get(Settings, 1).google_api_key_enc == "ENC"


def test_restore_rejects_unknown_version(data_dir):
    from app import backup, db

    db.reset_engine()
    db.init_db()
    with _session() as s:
        with pytest.raises(ValueError):
            backup.restore_backup(s, {"version": 999})


def test_archive_round_trips_image_files(data_dir):
    from app import backup, db
    from app.enrich.images import images_dir
    from app.models import POI

    db.reset_engine()
    db.init_db()
    (images_dir() / "pic.webp").write_bytes(b"IMAGEBYTES")
    with _session() as s:
        _seed(s)
        raw = backup.build_backup_archive(s)

    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        assert "backup.json" in z.namelist()
        assert "images/pic.webp" in z.namelist()

    # delete the image file, then restore the archive and confirm it's rewritten
    (images_dir() / "pic.webp").unlink()
    with _session() as s:
        for row in s.exec(select(POI)).all():
            s.delete(row)
        s.commit()
    with _session() as s:
        backup.restore_from_archive(s, raw)
    assert (images_dir() / "pic.webp").read_bytes() == b"IMAGEBYTES"


# ---- endpoint-level ----

def _setup_admin(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})


def test_backup_download_is_a_zip(client):
    _setup_admin(client)
    client.post("/api/categories", json={"name": "Food"})
    res = client.get("/api/backup")
    assert res.status_code == 200
    assert res.headers["content-disposition"] == 'attachment; filename="minimalpoi-backup.zip"'
    with zipfile.ZipFile(io.BytesIO(res.content)) as z:
        assert "backup.json" in z.namelist()


def test_backup_requires_admin(client):
    _setup_admin(client)
    client.post("/api/users", json={"username": "bob", "password": "pw123456"})
    client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})
    assert client.get("/api/backup").status_code == 403
    assert client.post("/api/restore", files={"file": ("b.zip", b"x", "application/zip")}).status_code == 403


def test_restore_409_when_db_not_empty(client):
    _setup_admin(client)
    client.post("/api/categories", json={"name": "Food"})
    res = client.post("/api/restore", files={"file": ("b.zip", b"x", "application/zip")})
    assert res.status_code == 409


def test_restore_loads_an_archive_into_a_fresh_instance(client):
    from app import backup, db
    from app.enrich.images import images_dir
    from app.models import POI, Category

    _setup_admin(client)  # bootstrap admin; no pois/categories yet -> "empty"
    # Build an archive in a throwaway populated state captured from a second engine
    # is overkill; instead hand-craft a minimal valid archive.
    data = {
        "version": backup.BACKUP_VERSION,
        "users": [{"id": 1, "username": "restored-admin", "password_hash": "h", "role": "admin", "preferred_team_id": None, "disabled": False, "created_at": "2026-06-29T00:00:00+00:00"}],
        "teams": [],
        "team_members": [],
        "categories": [{"id": 3, "name": "Parks", "color": "#2F9E63", "icon": None, "created_by": 1, "created_at": "2026-06-29T00:00:00+00:00", "trip_category_id": None, "trip_sync_status": "local_only", "trip_synced_snapshot": None, "trip_synced_at": None, "trip_last_error": None}],
        "pois": [{"id": 9, "name": "Vondel", "address": None, "city": None, "country_code": None, "lat": 52.0, "lng": 4.0, "category_id": 3, "tags": [], "notes": None, "phone": None, "email": None, "website": None, "image_url": "/images/v.webp", "source_url": None, "created_by": 1, "created_at": "2026-06-29T00:00:00+00:00", "updated_at": "2026-06-29T00:00:00+00:00", "trip_place_id": None, "trip_sync_status": "local_only", "trip_synced_snapshot": None, "trip_synced_at": None, "trip_last_error": None}],
        "visits": [],
        "comments": [],
        "settings": None,
    }
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        import json

        z.writestr("backup.json", json.dumps(data))
        z.writestr("images/v.webp", b"VV")

    res = client.post("/api/restore", files={"file": ("b.zip", buf.getvalue(), "application/zip")})
    assert res.status_code == 200

    db.reset_engine()
    with _session() as s:
        assert s.get(POI, 9).name == "Vondel"
        assert s.get(Category, 3).name == "Parks"
    assert (images_dir() / "v.webp").read_bytes() == b"VV"
