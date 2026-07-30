def test_sync_now_requires_admin(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    client.post("/api/users", json={"username": "bob", "password": "pw123456"})
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})
    assert client.post("/api/sync/now").status_code == 403


def test_sync_now_noop_when_not_configured(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    resp = client.post("/api/sync/now")
    assert resp.status_code == 200
    assert resp.json()["ran"] is False  # TRIP not configured


def test_sync_status_shape(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    body = client.get("/api/sync/status").json()
    assert body["enabled"] is False
    assert "error_count" in body and "conflict_count" in body


def test_status_count_helper_counts_by_status(client):
    from sqlmodel import Session

    from app import db
    from app.models import POI, Category, SyncStatus
    from app.routers.sync import _status_count

    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    cat_id = client.post("/api/categories", json={"name": "Food"}).json()["id"]
    pid = client.post("/api/pois", json={"name": "P", "lat": 1.0, "lng": 2.0}).json()["id"]
    with Session(db.engine) as s:
        p = s.get(POI, pid)
        p.trip_sync_status = SyncStatus.ERROR
        s.add(p)
        c = s.get(Category, cat_id)
        c.trip_sync_status = SyncStatus.CONFLICT
        s.add(c)
        s.commit()
        assert _status_count(s, POI, SyncStatus.ERROR) == 1
        assert _status_count(s, POI, SyncStatus.CONFLICT) == 0
        assert _status_count(s, Category, SyncStatus.CONFLICT) == 1


def test_sync_status_reports_error_and_conflict_counts(client):
    from sqlmodel import Session

    from app import db
    from app.models import POI, Category, SyncStatus

    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    cat_id = client.post("/api/categories", json={"name": "Food"}).json()["id"]
    pid = client.post("/api/pois", json={"name": "P", "lat": 1.0, "lng": 2.0}).json()["id"]
    with Session(db.engine) as s:
        p = s.get(POI, pid)
        p.trip_sync_status = SyncStatus.ERROR
        s.add(p)
        c = s.get(Category, cat_id)
        c.trip_sync_status = SyncStatus.CONFLICT
        s.add(c)
        s.commit()
    body = client.get("/api/sync/status").json()
    assert body["error_count"] == 1
    assert body["conflict_count"] == 1
