def _route(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    client.patch("/api/settings", json={"routes_enabled": True})
    return client.post("/api/routes", json={"name": "NL", "start_date": "2026-07-14"}).json()["id"]


def _poi(client, name, lat, lng):
    cat = client.post("/api/categories", json={"name": "C"}).json()["id"]
    return client.post("/api/pois", json={"name": name, "lat": lat, "lng": lng, "category_id": cat}).json()["id"]


def test_add_stay_from_poi_snapshots_location(client):
    rid = _route(client)
    pid = _poi(client, "Amsterdam", 52.3676, 4.9041)
    r = client.post(f"/api/routes/{rid}/nodes",
                    json={"kind": "stay", "poi_id": pid, "nights": 2})
    assert r.status_code == 201
    node = r.json()["nodes"][0]
    assert node["name"] == "Amsterdam" and node["lat"] == 52.3676 and node["nights"] == 2


def test_add_adhoc_stop_and_leg_computed(client):
    rid = _route(client)
    client.post(f"/api/routes/{rid}/nodes", json={"kind": "stay", "name": "A", "lat": 52.3676, "lng": 4.9041, "nights": 1})
    detail = client.post(f"/api/routes/{rid}/nodes", json={"kind": "stay", "name": "B", "lat": 52.0907, "lng": 5.1214, "nights": 1}).json()
    assert len(detail["nodes"]) == 2
    assert len(detail["legs"]) == 1
    assert detail["legs"][0]["distance_m"] > 0
    assert detail["total_duration_s"] > 0
    # scheduled end date = start + 2 nights
    assert detail["scheduled_end_date"] == "2026-07-16"


def test_reorder_and_delete_node(client):
    rid = _route(client)
    n1 = client.post(f"/api/routes/{rid}/nodes", json={"kind": "stay", "name": "A", "lat": 1.0, "lng": 1.0, "nights": 1}).json()["nodes"][0]["id"]
    client.post(f"/api/routes/{rid}/nodes", json={"kind": "stop", "name": "S", "lat": 2.0, "lng": 2.0})
    # move A to the end
    reordered = client.patch(f"/api/routes/{rid}/nodes/{n1}", json={"position": 99.0}).json()
    assert reordered["nodes"][-1]["id"] == n1
    assert client.delete(f"/api/routes/{rid}/nodes/{n1}").status_code == 200


def test_add_node_requires_owner(client):
    rid = _route(client)
    client.post("/api/users", json={"username": "bob", "password": "pw123456"})
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})
    assert client.post(f"/api/routes/{rid}/nodes", json={"kind": "stop", "name": "X", "lat": 1.0, "lng": 1.0}).status_code == 403


def test_recompute_endpoint_owner_ok_member_forbidden(client):
    rid = _route(client)
    client.post(f"/api/routes/{rid}/nodes", json={"kind": "stay", "name": "A", "lat": 52.3676, "lng": 4.9041, "nights": 1})
    client.post(f"/api/routes/{rid}/nodes", json={"kind": "stay", "name": "B", "lat": 52.0907, "lng": 5.1214, "nights": 1})
    assert client.post(f"/api/routes/{rid}/recompute").status_code == 200

    client.post("/api/users", json={"username": "bob", "password": "pw123456"})
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})
    assert client.post(f"/api/routes/{rid}/recompute").status_code == 403


def test_stop_day_offset_round_trips(client):
    rid = _route(client)
    client.post(f"/api/routes/{rid}/nodes", json={"kind": "stay", "name": "A", "lat": 1.0, "lng": 1.0, "nights": 2})
    detail = client.post(f"/api/routes/{rid}/nodes",
                         json={"kind": "stop", "name": "S", "lat": 2.0, "lng": 2.0, "day_offset": 1}).json()
    stop = next(n for n in detail["nodes"] if n["name"] == "S")
    assert stop["day_offset"] == 1


def test_stop_day_offset_can_be_updated(client):
    rid = _route(client)
    sid = client.post(f"/api/routes/{rid}/nodes", json={"kind": "stop", "name": "S", "lat": 2.0, "lng": 2.0}).json()["nodes"][0]["id"]
    detail = client.patch(f"/api/routes/{rid}/nodes/{sid}", json={"day_offset": 2}).json()
    stop = next(n for n in detail["nodes"] if n["id"] == sid)
    assert stop["day_offset"] == 2


def test_stay_day_offset_is_null(client):
    rid = _route(client)
    # Even if a client sends day_offset on a stay, it is not stored.
    detail = client.post(f"/api/routes/{rid}/nodes",
                         json={"kind": "stay", "name": "A", "lat": 1.0, "lng": 1.0, "nights": 1, "day_offset": 3}).json()
    stay = detail["nodes"][0]
    assert stay["day_offset"] is None
