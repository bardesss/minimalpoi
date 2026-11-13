import io
import json
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


def _real_webp() -> bytes:
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (8, 8), (10, 20, 30)).save(buf, "WEBP")
    return buf.getvalue()


def test_archive_round_trips_image_files(data_dir):
    from app import backup, db
    from app.enrich.images import images_dir
    from app.models import POI
    from PIL import Image

    db.reset_engine()
    db.init_db()
    (images_dir() / "pic.webp").write_bytes(_real_webp())
    with _session() as s:
        _seed(s)
        raw = backup.build_backup_archive(s)

    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        assert "backup.json" in z.namelist()
        assert "images/pic.webp" in z.namelist()

    # delete the image file, then restore the archive and confirm it's rewritten
    # as a valid (re-encoded) image.
    (images_dir() / "pic.webp").unlink()
    with _session() as s:
        for row in s.exec(select(POI)).all():
            s.delete(row)
        s.commit()
    with _session() as s:
        backup.restore_from_archive(s, raw)
    restored = images_dir() / "pic.webp"
    assert restored.is_file()
    assert Image.open(io.BytesIO(restored.read_bytes())).format == "WEBP"


def test_restore_skips_non_image_archive_members(data_dir):
    from app import backup, db
    from app.enrich.images import images_dir

    db.reset_engine()
    db.init_db()
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("backup.json", json.dumps({"version": backup.BACKUP_VERSION}))
        z.writestr("images/evil.html", b"<script>alert(1)</script>")
        z.writestr("images/ok.webp", _real_webp())
    with _session() as s:
        backup.restore_from_archive(s, buf.getvalue())
    assert not (images_dir() / "evil.html").exists()   # never written to the public dir
    assert (images_dir() / "ok.webp").is_file()          # real image kept (re-encoded)


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
        "categories": [{"id": 3, "name": "Parks", "color": "#2F9E63", "icon": None, "created_by": 1, "created_at": "2026-06-29T00:00:00+00:00"}],
        "pois": [{"id": 9, "name": "Vondel", "address": None, "city": None, "country_code": None, "lat": 52.0, "lng": 4.0, "category_id": 3, "tags": [], "notes": None, "phone": None, "email": None, "website": None, "image_url": "/images/v.webp", "source_url": None, "created_by": 1, "created_at": "2026-06-29T00:00:00+00:00", "updated_at": "2026-06-29T00:00:00+00:00"}],
        "visits": [],
        "comments": [],
        "settings": None,
    }
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("backup.json", json.dumps(data))
        z.writestr("images/v.webp", _real_webp())

    res = client.post("/api/restore", files={"file": ("b.zip", buf.getvalue(), "application/zip")})
    assert res.status_code == 200

    db.reset_engine()
    with _session() as s:
        assert s.get(POI, 9).name == "Vondel"
        assert s.get(Category, 3).name == "Parks"
    assert (images_dir() / "v.webp").is_file()


def test_restore_ignores_fields_removed_from_the_model(data_dir):
    """A pre-v4 archive carries trip_* keys and a tombstones section. Both are
    gone from _TABLES now, so restore_backup never even looks at those sections
    — they are not in scope for restoration. This test verifies that the archive
    can still restore (trip_* fields on POIs/Categories are silently accepted),
    and that tombstones was not accidentally re-added to _TABLES."""
    from sqlmodel import Session, select
    from app import db
    from app.backup import restore_backup
    from app.models import POI, Category

    db.reset_engine()
    db.init_db()
    data = {
        "version": 1,
        "users": [{"id": 1, "username": "admin", "password_hash": "x", "role": "admin"}],
        "categories": [{"id": 3, "name": "Parks", "color": "#2F9E63", "icon": None, "created_by": 1,
                        "trip_category_id": 9, "trip_sync_status": "synced",
                        "trip_synced_snapshot": None, "trip_synced_at": None, "trip_last_error": None}],
        "pois": [{"id": 5, "name": "Cafe", "lat": 52.37, "lng": 4.9, "created_by": 1, "category_id": 3,
                  "tags": [], "trip_place_id": 42, "trip_sync_status": "synced",
                  "trip_synced_snapshot": None, "trip_synced_at": None, "trip_last_error": None}],
        "tombstones": [{"id": 1, "entity_type": "place", "trip_id": 7, "origin": "local"}],
        "settings": {"id": 1, "trip_base_url": "https://trip.lan", "trip_sync_enabled": True,
                     "map_tile_url": "https://tiles.example/style.json"},
    }
    with Session(db.engine) as session:
        counts = restore_backup(session, data)

    assert "tombstones" not in counts  # guard against tombstones being re-added to _TABLES
    with Session(db.engine) as session:
        assert session.exec(select(POI)).first().name == "Cafe"
        assert session.exec(select(Category)).first().name == "Parks"
    db.reset_engine()


def test_restore_accepts_naive_timestamps_as_utc(data_dir):
    """Archives exported before timestamps were stored timezone-aware carry
    naive ISO strings ("2026-01-02T03:04:05"). They must still restore, read
    as UTC."""
    from datetime import datetime, timezone
    from sqlmodel import Session, select
    from app import db
    from app.backup import restore_backup
    from app.models import POI

    db.reset_engine()
    db.init_db()
    data = {
        "version": 1,
        "users": [{"id": 1, "username": "admin", "password_hash": "x", "role": "admin",
                   "created_at": "2026-01-02T03:04:05"}],
        "pois": [{"id": 5, "name": "Cafe", "lat": 52.37, "lng": 4.9, "created_by": 1,
                  "tags": [], "created_at": "2026-01-02T03:04:05",
                  "updated_at": "2026-01-02T03:04:05.123456"}],
    }
    with Session(db.engine) as session:
        restore_backup(session, data)

    with Session(db.engine) as session:
        poi = session.exec(select(POI)).first()
        assert poi.created_at == datetime(2026, 1, 2, 3, 4, 5, tzinfo=timezone.utc)
    db.reset_engine()


# ---- v2: routes, tokens, emptiness ----

PDF = b"%PDF-1.4\n%backup test\n"


def _enable_routes(client):
    assert client.patch("/api/settings", json={"routes_enabled": True}).status_code == 200


def _v1_users():
    # created_at well in the past so any "issued before account creation"
    # token check keeps the test client's login cookie valid after restore.
    return [{"id": 1, "username": "admin", "password_hash": "h", "role": "admin",
             "preferred_team_id": None, "disabled": False, "token_version": 0,
             "created_at": "2020-01-01T00:00:00+00:00"}]


def _zip(data: dict, extra: dict[str, bytes] | None = None) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("backup.json", json.dumps(data))
        for name, payload in (extra or {}).items():
            z.writestr(name, payload)
    return buf.getvalue()


def test_backup_round_trip_includes_routes(client):
    from sqlmodel import SQLModel
    from app import attachments, db
    from app.models import Route, RouteAttachment, RouteNode, RouteShare

    _setup_admin(client)
    _enable_routes(client)
    rid = client.post("/api/routes", json={"name": "NL", "start_date": "2026-07-14"}).json()["id"]
    for name, lat in (("Utrecht", 52.09), ("Amsterdam", 52.37)):
        assert client.post(f"/api/routes/{rid}/nodes",
                           json={"kind": "stop", "name": name, "lat": lat, "lng": 5.0}).status_code == 201
    share_token = client.put(f"/api/routes/{rid}/share", json={}).json()["token"]
    with _session() as s:
        att_node = s.exec(select(RouteNode)).first().id
    up = client.post(f"/api/routes/{rid}/attachments", data={"node_id": str(att_node)},
                     files={"file": ("hotel.pdf", io.BytesIO(PDF), "application/pdf")})
    assert up.status_code == 201
    with _session() as s:
        before_nodes = sorted((n.name, n.position) for n in s.exec(select(RouteNode)).all())
        stored = s.exec(select(RouteAttachment)).one().stored_filename

    res = client.get("/api/backup")
    assert res.status_code == 200
    raw = res.content
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        assert json.loads(z.read("backup.json"))["version"] == 2
        assert f"route_attachments/{stored}" in z.namelist()

    # Wipe: fresh schema, attachment file gone, bootstrap a new admin.
    SQLModel.metadata.drop_all(db.engine)
    db.init_db()
    (attachments.attachments_dir() / stored).unlink()
    client.cookies.clear()
    _setup_admin(client)

    res = client.post("/api/restore", files={"file": ("b.zip", raw, "application/zip")})
    assert res.status_code == 200, res.text
    assert res.json()["restored"]["routes"] == 1

    with _session() as s:
        assert s.get(Route, rid).name == "NL"
        assert sorted((n.name, n.position) for n in s.exec(select(RouteNode)).all()) == before_nodes
        assert s.exec(select(RouteShare)).one().token == share_token
        restored = s.exec(select(RouteAttachment)).one()
        assert restored.stored_filename == stored
        assert restored.node_id == att_node
    path = attachments.attachments_dir() / stored
    assert path.is_file() and path.read_bytes() == PDF


def test_is_empty_false_with_only_a_route(client):
    from app import backup

    _setup_admin(client)
    _enable_routes(client)
    assert client.post("/api/routes", json={"name": "NL", "start_date": "2026-07-14"}).status_code == 201
    with _session() as s:
        assert backup.is_empty(s) is False


def test_is_empty_false_with_api_token(client):
    from app import backup

    _setup_admin(client)
    with _session() as s:
        assert backup.is_empty(s) is True  # bootstrap admin alone is still "empty"
    assert client.post("/api/tokens", json={"name": "ci"}).status_code == 201
    with _session() as s:
        assert backup.is_empty(s) is False


def test_is_empty_false_with_a_second_user(client):
    from app import backup

    _setup_admin(client)
    assert client.post("/api/users", json={"username": "bob", "password": "pw123456"}).status_code == 201
    with _session() as s:
        assert backup.is_empty(s) is False


def test_restore_api_returns_409_when_only_a_route_exists(client):
    _setup_admin(client)
    _enable_routes(client)
    client.post("/api/routes", json={"name": "NL", "start_date": "2026-07-14"})
    res = client.post("/api/restore", files={"file": ("b.zip", b"x", "application/zip")})
    assert res.status_code == 409


def test_restore_revokes_api_tokens(client):
    from app import backup

    _setup_admin(client)
    token = client.post("/api/tokens", json={"name": "ci"}).json()["token"]
    bearer = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/categories", headers=bearer).status_code == 200

    # The restored user 1 has the same id and token_version as the token's
    # owner, so only an explicit revocation keeps the old token out.
    data = {"version": 2, "users": _v1_users(), "settings": None}
    with _session() as s:
        backup.restore_from_archive(s, _zip(data))
    assert client.get("/api/categories", headers=bearer).status_code == 401


def test_restore_v1_archive_still_works(client):
    from app import backup

    _setup_admin(client)
    _enable_routes(client)
    assert client.post("/api/routes", json={"name": "Old", "start_date": "2026-07-14"}).status_code == 201

    data = {
        "version": 1,
        "users": _v1_users(),
        "teams": [], "team_members": [],
        "categories": [{"id": 3, "name": "Parks", "color": "#2F9E63", "icon": None, "created_by": 1,
                        "created_at": "2026-06-29T00:00:00+00:00"}],
        "pois": [], "visits": [], "comments": [],
        "settings": {"id": 1, "routes_enabled": True},
    }
    with _session() as s:
        summary = backup.restore_from_archive(s, _zip(data))
    assert summary["categories"] == 1
    res = client.get("/api/routes")
    assert res.status_code == 200
    assert res.json() == []


def test_restore_skips_unsafe_attachment_members(data_dir):
    from app import attachments, backup, db

    db.reset_engine()
    db.init_db()
    data = {
        "version": 2,
        "users": _v1_users(),
        "routes": [{"id": 1, "name": "NL", "start_date": "2026-07-14", "created_by": 1}],
        "route_attachments": [
            {"id": 1, "route_id": 1, "filename": "a.pdf", "stored_filename": "good.pdf",
             "content_type": "application/pdf", "size": len(PDF), "uploaded_by": 1},
            {"id": 2, "route_id": 1, "filename": "b.pdf", "stored_filename": "fake.pdf",
             "content_type": "application/pdf", "size": 5, "uploaded_by": 1},
        ],
    }
    raw = _zip(data, {
        "route_attachments/good.pdf": PDF,
        "route_attachments/fake.pdf": b"<html>nope</html>",       # fails sniff
        "route_attachments/orphan.pdf": PDF,                        # no matching row
        "route_attachments/../../evil.pdf": PDF,                    # path trick, flattened -> no row
    })
    with _session() as s:
        backup.restore_from_archive(s, raw)
    d = attachments.attachments_dir()
    assert (d / "good.pdf").read_bytes() == PDF
    assert not (d / "fake.pdf").exists()
    assert not (d / "orphan.pdf").exists()
    assert not (d / "evil.pdf").exists()
    assert not (d.parent / "evil.pdf").exists()


# ---- restore applies the boot-time normalisations ----

def _restore_via_api(client, data):
    return client.post("/api/restore", files={"file": ("b.zip", _zip(data), "application/zip")})


def test_restore_lowercases_usernames_so_login_works_immediately(client):
    from app.security import hash_password

    _setup_admin(client)
    users = [{**_v1_users()[0], "username": "Admin", "password_hash": hash_password("secret123")}]
    data = {"version": 1, "users": users, "teams": [], "team_members": [], "categories": [],
            "pois": [], "visits": [], "comments": [], "settings": None}
    res = _restore_via_api(client, data)
    assert res.status_code == 200, res.text
    client.cookies.clear()
    login = client.post("/api/auth/login", json={"username": "Admin", "password": "secret123"})
    assert login.status_code == 200, login.text
    assert login.json()["username"] == "admin"


def test_restore_keeps_colliding_username_unchanged(client):
    from app.models import User

    _setup_admin(client)
    users = [_v1_users()[0], {**_v1_users()[0], "id": 2, "username": "Admin", "role": "member"}]
    data = {"version": 2, "users": users, "settings": None}
    assert _restore_via_api(client, data).status_code == 200
    with _session() as s:
        assert {u.username for u in s.exec(select(User)).all()} >= {"admin", "Admin"}


def test_restore_dedupes_duplicate_role_nodes(client):
    from app.models import NodeRole, RouteNode

    _setup_admin(client)
    node = {"route_id": 1, "kind": "stop", "name": "X", "lat": 52.0, "lng": 5.0}
    data = {
        "version": 2, "users": _v1_users(), "settings": None,
        "routes": [{"id": 1, "name": "NL", "start_date": "2026-07-14", "created_by": 1}],
        "route_nodes": [
            {**node, "id": 5, "position": 1.0, "role": "start"},
            {**node, "id": 3, "position": 2.0, "role": "start"},
            {**node, "id": 7, "position": 3.0, "role": "end"},
        ],
    }
    res = _restore_via_api(client, data)
    assert res.status_code == 200, res.text
    with _session() as s:
        roles = {n.id: n.role for n in s.exec(select(RouteNode)).all()}
    assert roles == {3: NodeRole.START, 5: None, 7: NodeRole.END}


def test_restore_nulls_dangling_team_and_poi_refs(client):
    from app.models import RouteNode, User, Visit

    _setup_admin(client)
    users = [{**_v1_users()[0], "preferred_team_id": 42}]
    data = {
        "version": 2, "users": users, "settings": None,
        "pois": [{"id": 9, "name": "Vondel", "lat": 52.0, "lng": 4.0, "tags": [], "created_by": 1}],
        "visits": [{"id": 1, "poi_id": 9, "user_id": 1, "team_id": 42, "rating": 4}],
        "routes": [{"id": 1, "name": "NL", "start_date": "2026-07-14", "created_by": 1, "team_id": 42}],
        "route_nodes": [{"id": 1, "route_id": 1, "position": 1.0, "kind": "stop", "name": "X",
                         "lat": 52.0, "lng": 5.0, "poi_id": 77}],
    }
    res = _restore_via_api(client, data)
    assert res.status_code == 200, res.text
    with _session() as s:
        assert s.get(User, 1).preferred_team_id is None
        assert s.get(Visit, 1).team_id is None
        assert s.get(RouteNode, 1).poi_id is None
        from app.models import Route
        assert s.get(Route, 1).team_id is None


def test_restore_integrity_error_is_400_and_rolls_back(client):
    from app.models import User

    _setup_admin(client)
    users = [_v1_users()[0], {**_v1_users()[0], "id": 2}]  # same username twice
    res = _restore_via_api(client, {"version": 2, "users": users, "settings": None})
    assert res.status_code == 400
    assert "conflict" in res.json()["detail"].lower()
    with _session() as s:
        # All-or-nothing: the bootstrap admin is still the only user.
        assert [u.username for u in s.exec(select(User)).all()] == ["admin"]
        assert s.exec(select(User)).one().created_at.year >= 2026
