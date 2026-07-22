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


def test_export_gpx(client):
    rid = _setup(client)
    r = client.get(f"/api/routes/{rid}/export?format=gpx")
    assert r.status_code == 200
    assert "application/gpx+xml" in r.headers["content-type"]
    body = r.text
    assert body.startswith("<?xml")
    assert "<gpx" in body
    assert body.count("<wpt ") == 2          # one waypoint per node
    assert "<trk>" in body and body.count("<trkpt ") == 2
    assert 'lat="52.3"' in body and 'lon="4.9"' in body


def test_export_kml(client):
    rid = _setup(client)
    r = client.get(f"/api/routes/{rid}/export?format=kml")
    assert r.status_code == 200
    assert "kml" in r.headers["content-type"]
    body = r.text
    assert "<kml" in body
    assert body.count("<Placemark>") == 3    # 2 points + 1 line
    assert "4.9,52.3" in body                # KML is lng,lat


def test_export_unknown_format_rejected(client):
    rid = _setup(client)
    assert client.get(f"/api/routes/{rid}/export?format=xyz").status_code == 400
