from app.dedup import haversine_m


def _setup(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    return client.post("/api/categories", json={"name": "Food"}).json()["id"]


def test_haversine_known_distance():
    # Amsterdam Dam square to Amsterdam Centraal ~ 800m.
    d = haversine_m(52.3731, 4.8922, 52.3791, 4.9003)
    assert 600 < d < 1100


def test_create_normalizes_phone_to_e164(client):
    _setup(client)
    poi = client.post(
        "/api/pois",
        json={"name": "X", "lat": 52.3, "lng": 4.9, "phone": "+31 20 308 0090"},
    ).json()
    assert poi["phone"] == "+31203080090"


def test_update_normalizes_phone_and_keeps_unparseable(client):
    _setup(client)
    pid = client.post("/api/pois", json={"name": "X", "lat": 52.3, "lng": 4.9}).json()["id"]
    # International form normalizes...
    assert client.patch(f"/api/pois/{pid}", json={"phone": "+1 (212) 736-3100"}).json()["phone"] == "+12127363100"
    # ...a bare national number (no country code) is kept as typed, never rejected.
    assert client.patch(f"/api/pois/{pid}", json={"phone": "020 308 0090"}).json()["phone"] == "020 308 0090"


def test_poi_crud(client):
    cat_id = _setup(client)
    created = client.post(
        "/api/pois",
        json={"name": "Café Modern", "address": "Amsterdam", "lat": 52.3, "lng": 4.9,
              "category_id": cat_id, "tags": ["popular"]},
    )
    assert created.status_code == 201
    poi = created.json()
    assert poi["name"] == "Café Modern"
    assert poi["tags"] == ["popular"]
    assert poi["trip_sync_status"] == "local_only"

    updated = client.patch(f"/api/pois/{poi['id']}", json={"notes": "great coffee"})
    assert updated.json()["notes"] == "great coffee"

    assert len(client.get("/api/pois").json()) == 1
    assert client.delete(f"/api/pois/{poi['id']}").status_code == 204
    assert client.get("/api/pois").json() == []


def test_duplicate_detection_by_proximity_and_url(client):
    cat_id = _setup(client)
    client.post(
        "/api/pois",
        json={"name": "Café Modern", "address": "A'dam", "lat": 52.3676, "lng": 4.9041,
              "category_id": cat_id, "source_url": "https://maps.example/cafe"},
    )
    # same name, ~tens of meters away -> duplicate
    near = client.post("/api/pois/check-duplicate",
                       json={"name": "Cafe Modern", "lat": 52.3677, "lng": 4.9042})
    assert near.json()["duplicate_id"] is not None
    # same source url -> duplicate
    by_url = client.post("/api/pois/check-duplicate",
                         json={"name": "Whatever", "source_url": "https://maps.example/cafe"})
    assert by_url.json()["duplicate_id"] is not None
    # far away, different name -> not a duplicate
    far = client.post("/api/pois/check-duplicate",
                      json={"name": "Other Place", "lat": 48.0, "lng": 2.0})
    assert far.json()["duplicate_id"] is None


def test_delete_poi_cascades_children(client):
    cat_id = _setup(client)
    poi = client.post(
        "/api/pois",
        json={"name": "Cascade Test", "lat": 1.0, "lng": 2.0, "category_id": cat_id},
    ).json()
    poi_id = poi["id"]

    # Add a visit and comment
    assert client.put(f"/api/pois/{poi_id}/visit", json={}).status_code == 200
    assert client.post(f"/api/pois/{poi_id}/comments", json={"text": "nice"}).status_code == 201

    assert client.delete(f"/api/pois/{poi_id}").status_code == 204

    from sqlmodel import Session, select
    from app import db
    from app.models import Visit, Comment
    with Session(db.engine) as session:
        assert session.exec(select(Visit).where(Visit.poi_id == poi_id)).all() == []
        assert session.exec(select(Comment).where(Comment.poi_id == poi_id)).all() == []


def test_delete_synced_poi_writes_tombstone(client):
    cat_id = _setup(client)
    poi = client.post(
        "/api/pois",
        json={"name": "Synced Place", "lat": 1.0, "lng": 2.0, "category_id": cat_id},
    ).json()

    # Simulate a synced POI by setting trip_place_id directly in the DB.
    from sqlmodel import Session, select
    from app import db
    from app.models import POI, Tombstone
    with Session(db.engine) as session:
        p = session.get(POI, poi["id"])
        p.trip_place_id = 555
        session.add(p)
        session.commit()

    assert client.delete(f"/api/pois/{poi['id']}").status_code == 204

    with Session(db.engine) as session:
        tombstones = session.exec(select(Tombstone)).all()
        assert len(tombstones) == 1
        assert tombstones[0].entity_type == "place"
        assert tombstones[0].trip_id == 555
        assert tombstones[0].origin == "local"


def test_list_pois_includes_average_rating(client):
    cat_id = _setup(client)
    rated = client.post(
        "/api/pois", json={"name": "Rated", "lat": 1.0, "lng": 2.0, "category_id": cat_id}
    ).json()["id"]
    unrated = client.post(
        "/api/pois", json={"name": "Unrated", "lat": 3.0, "lng": 4.0, "category_id": cat_id}
    ).json()["id"]

    # Admin rates 4; a visit with no rating must not count toward the average.
    assert client.put(f"/api/pois/{rated}/visit", json={"rating": 4}).status_code == 200
    assert client.put(f"/api/pois/{unrated}/visit", json={}).status_code == 200

    # A second user rates the same place 2 -> average is 3.0 over 2 ratings.
    client.post("/api/users", json={"username": "bob", "password": "pw123456"})
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})
    assert client.put(f"/api/pois/{rated}/visit", json={"rating": 2}).status_code == 200

    by_id = {p["id"]: p for p in client.get("/api/pois").json()}
    assert by_id[rated]["avg_rating"] == 3.0
    assert by_id[rated]["rating_count"] == 2
    # An unrated visit leaves the place with no average.
    assert by_id[unrated]["avg_rating"] is None
    assert by_id[unrated]["rating_count"] == 0
