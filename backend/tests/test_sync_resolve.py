from types import SimpleNamespace

import app.db as _db
from sqlmodel import Session, select

from app.models import POI, Category, SyncStatus, User
from app.trip.resolve import apply_category_snapshot, apply_place_snapshot


def _setup(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})


# --- Task 1: last-run plumbing -------------------------------------------------

def test_sync_status_last_run_defaults_none(client):
    _setup(client)
    body = client.get("/api/sync/status").json()
    assert body["last_run"] is None
    assert body["enabled"] is False
    assert body["error_count"] == 0 and body["conflict_count"] == 0


def test_settings_read_exposes_last_sync(client):
    _setup(client)
    s = client.get("/api/settings").json()
    assert "trip_last_sync_at" in s
    assert s["trip_last_sync_at"] is None


# --- Task 2: pure snapshot-apply helpers ---------------------------------------

def test_apply_place_snapshot_overwrites_fields_but_keeps_image():
    poi = SimpleNamespace(name="Old", lat=1.0, lng=2.0, address="x", notes="n",
                          website=None, phone=None, email=None, image_url="/images/keep.jpg",
                          category_id=None)
    snap = {"name": "New", "lat": 5.0, "lng": 6.0, "place": "Main St",
            "category_id": 99, "description": "desc",
            "links": ["https://site.example", "tel:+311", "mailto:a@b.c"]}
    apply_place_snapshot(poi, snap, category_id=7)
    assert (poi.name, poi.lat, poi.lng, poi.address, poi.notes) == ("New", 5.0, 6.0, "Main St", "desc")
    assert poi.website == "https://site.example" and poi.phone == "+311" and poi.email == "a@b.c"
    assert poi.category_id == 7
    assert poi.image_url == "/images/keep.jpg"  # snapshot carries no image — must not be wiped


def test_apply_category_snapshot_sets_name_and_color():
    cat = SimpleNamespace(name="Old", color="#000000")
    apply_category_snapshot(cat, {"name": "Food", "color": "#ff0000"})
    assert cat.name == "Food" and cat.color == "#ff0000"


# --- Task 3: conflicts + resolve endpoints -------------------------------------

def _make_admin_and_poi_in_conflict(client):
    _setup(client)
    with Session(_db.engine) as s:
        uid = s.exec(select(User).where(User.username == "admin")).first().id
        poi = POI(name="Local Name", lat=1.0, lng=2.0, created_by=uid,
                  trip_place_id=55, trip_sync_status=SyncStatus.CONFLICT,
                  trip_last_error=None,
                  trip_synced_snapshot={"name": "TRIP Name", "lat": 9.0, "lng": 8.0,
                                        "place": "Trip Addr", "category_id": None,
                                        "description": "from trip", "links": []})
        s.add(poi)
        s.commit()
        s.refresh(poi)
        return poi.id


def _login_member(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})
    client.post("/api/users", json={"username": "bob", "password": "pw", "role": "member"})
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw"})


def test_conflicts_requires_admin(client):
    _login_member(client)
    assert client.get("/api/sync/conflicts").status_code == 403


def test_conflicts_requires_auth(client):
    assert client.get("/api/sync/conflicts").status_code == 401


def test_conflicts_lists_place_in_conflict(client):
    pid = _make_admin_and_poi_in_conflict(client)
    rows = client.get("/api/sync/conflicts").json()
    row = next(r for r in rows if r["id"] == pid and r["entity_type"] == "place")
    assert row["name"] == "Local Name" and row["trip_id"] == 55 and row["status"] == "conflict"


def test_resolve_local_marks_pending(client):
    pid = _make_admin_and_poi_in_conflict(client)
    rows = client.post("/api/sync/resolve",
                       json={"entity_type": "place", "id": pid, "resolution": "local"}).json()
    assert all(r["id"] != pid for r in rows)  # no longer in conflict list
    with Session(_db.engine) as s:
        assert s.get(POI, pid).trip_sync_status == SyncStatus.PENDING


def test_resolve_trip_overwrites_from_snapshot(client):
    pid = _make_admin_and_poi_in_conflict(client)
    client.post("/api/sync/resolve",
                json={"entity_type": "place", "id": pid, "resolution": "trip"})
    with Session(_db.engine) as s:
        poi = s.get(POI, pid)
        assert poi.name == "TRIP Name" and poi.address == "Trip Addr"
        assert poi.trip_sync_status == SyncStatus.SYNCED


def test_resolve_404_when_not_in_conflict(client):
    _setup(client)
    r = client.post("/api/sync/resolve",
                    json={"entity_type": "place", "id": 9999, "resolution": "local"})
    assert r.status_code == 404


def test_resolve_trip_without_snapshot_409(client):
    _setup(client)
    with Session(_db.engine) as s:
        uid = s.exec(select(User).where(User.username == "admin")).first().id
        poi = POI(name="Errd", lat=1.0, lng=2.0, created_by=uid,
                  trip_sync_status=SyncStatus.ERROR, trip_last_error="boom",
                  trip_synced_snapshot=None)
        s.add(poi)
        s.commit()
        s.refresh(poi)
        pid = poi.id
    r = client.post("/api/sync/resolve",
                    json={"entity_type": "place", "id": pid, "resolution": "trip"})
    assert r.status_code == 409
