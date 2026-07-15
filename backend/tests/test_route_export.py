def _setup(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    client.patch("/api/settings", json={"routes_enabled": True})
    rid = client.post("/api/routes", json={"name": "NL", "start_date": "2026-07-14"}).json()["id"]
    client.post(f"/api/routes/{rid}/nodes", json={"kind": "stay", "name": "A", "lat": 52.3, "lng": 4.9, "nights": 1})
    client.post(f"/api/routes/{rid}/nodes", json={"kind": "stop", "name": "B", "lat": 52.1, "lng": 5.1})
    return rid


def test_export_geojson_points_and_line(client):
    rid = _setup(client)
    fc = client.get(f"/api/routes/{rid}/export").json()
    assert fc["type"] == "FeatureCollection"
    geoms = [f["geometry"]["type"] for f in fc["features"]]
    assert geoms.count("Point") == 2
    assert geoms.count("LineString") == 1
    line = next(f for f in fc["features"] if f["geometry"]["type"] == "LineString")
    assert line["geometry"]["coordinates"] == [[4.9, 52.3], [5.1, 52.1]]  # [lng, lat] order
