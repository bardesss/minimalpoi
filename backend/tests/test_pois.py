from app.dedup import haversine_m


def _setup(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})
    return client.post("/api/categories", json={"name": "Food"}).json()["id"]


def test_haversine_known_distance():
    # Amsterdam Dam square to Amsterdam Centraal ~ 800m.
    d = haversine_m(52.3731, 4.8922, 52.3791, 4.9003)
    assert 600 < d < 1100


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
