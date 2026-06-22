def _setup_admin(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})


def test_category_crud(client):
    _setup_admin(client)
    created = client.post(
        "/api/categories",
        json={"name": "Food", "color": "#2F9E63", "icon": "utensils"},
    )
    assert created.status_code == 201
    cat = created.json()
    assert cat["name"] == "Food"
    assert cat["icon"] == "utensils"
    assert cat["trip_sync_status"] == "local_only"
    assert cat["trip_category_id"] is None

    updated = client.patch(f"/api/categories/{cat['id']}", json={"color": "#E0A22A"})
    assert updated.json()["color"] == "#E0A22A"

    assert len(client.get("/api/categories").json()) == 1
    assert client.delete(f"/api/categories/{cat['id']}").status_code == 204


def test_delete_synced_category_writes_tombstone(client):
    _setup_admin(client)
    cat = client.post("/api/categories", json={"name": "Synced"}).json()

    # Simulate a synced category by setting trip_category_id directly in the DB.
    from sqlmodel import Session, select
    from app import db
    from app.models import Category, Tombstone
    with Session(db.engine) as session:
        c = session.get(Category, cat["id"])
        c.trip_category_id = 999
        session.add(c)
        session.commit()

    assert client.delete(f"/api/categories/{cat['id']}").status_code == 204

    with Session(db.engine) as session:
        tombstones = session.exec(select(Tombstone)).all()
        assert len(tombstones) == 1
        assert tombstones[0].entity_type == "category"
        assert tombstones[0].trip_id == 999
        assert tombstones[0].origin == "local"


def test_delete_category_nulls_referencing_pois(client):
    _setup_admin(client)
    cat = client.post("/api/categories", json={"name": "Food", "color": "#fff"}).json()
    poi = client.post("/api/pois", json={"name": "X", "lat": 1.0, "lng": 2.0, "category_id": cat["id"]}).json()
    assert client.delete(f"/api/categories/{cat['id']}").status_code == 204
    got = client.get(f"/api/pois/{poi['id']}").json()
    assert got["category_id"] is None
