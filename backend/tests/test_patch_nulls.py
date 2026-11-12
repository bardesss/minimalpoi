import pytest


def _admin(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})


def _poi(client):
    return client.post("/api/pois", json={"name": "P", "lat": 1.0, "lng": 2.0, "notes": "n"}).json()["id"]


def _route_with_node(client):
    _admin(client)
    client.patch("/api/settings", json={"routes_enabled": True})
    rid = client.post("/api/routes", json={"name": "R", "start_date": "2026-07-14"}).json()["id"]
    node = client.post(
        f"/api/routes/{rid}/nodes",
        json={"kind": "stay", "name": "A", "lat": 1.0, "lng": 1.0, "nights": 1},
    ).json()["nodes"][0]
    return rid, node["id"]


def test_poi_patch_null_tags_is_422(client):
    _admin(client)
    pid = _poi(client)
    assert client.patch(f"/api/pois/{pid}", json={"tags": None}).status_code == 422
    assert client.get("/api/pois").status_code == 200


@pytest.mark.parametrize("field", ["lat", "lng", "name"])
def test_poi_patch_null_lat_name_is_422(client, field):
    _admin(client)
    pid = _poi(client)
    assert client.patch(f"/api/pois/{pid}", json={field: None}).status_code == 422


def test_poi_patch_null_notes_clears(client):
    _admin(client)
    pid = _poi(client)
    r = client.patch(f"/api/pois/{pid}", json={"notes": None})
    assert r.status_code == 200
    assert r.json()["notes"] is None


@pytest.mark.parametrize("field", ["name", "start_date"])
def test_route_patch_null_name_and_start_date_is_422(client, field):
    rid, _ = _route_with_node(client)
    assert client.patch(f"/api/routes/{rid}", json={field: None}).status_code == 422


def test_node_patch_null_position_is_422(client):
    rid, nid = _route_with_node(client)
    assert client.patch(f"/api/routes/{rid}/nodes/{nid}", json={"position": None}).status_code == 422


def test_settings_patch_null_map_tile_url_is_422(client):
    _admin(client)
    assert client.patch("/api/settings", json={"map_tile_url": None}).status_code == 422
