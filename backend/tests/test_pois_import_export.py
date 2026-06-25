import io
import json


def _setup(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})


def _upload(client, filename, content):
    return client.post(
        "/api/pois/import",
        files={"file": (filename, io.BytesIO(content.encode("utf-8")), "application/octet-stream")},
    )


def test_import_requires_auth(client):
    r = _upload(client, "x.csv", "name,lat,lng\nA,1,2\n")
    assert r.status_code == 401


def test_import_csv_creates_pois_and_category(client):
    _setup(client)
    text = "name,category,lat,lng,tags\nCafe,Food,52.37,4.9,a;b\n"
    r = _upload(client, "places.csv", text)
    assert r.status_code == 200
    body = r.json()
    assert body["created"] == 1
    assert body["skipped"] == 0
    assert body["errors"] == []
    assert len(body["created_ids"]) == 1
    # Category was created and is reused — list it.
    cats = client.get("/api/categories").json()
    assert any(c["name"] == "Food" for c in cats)
    poi = client.get("/api/pois").json()[0]
    assert poi["tags"] == ["a", "b"]


def test_import_skips_duplicates(client):
    _setup(client)
    client.post("/api/pois", json={"name": "Cafe", "lat": 52.37, "lng": 4.9})
    text = "name,lat,lng\nCafe,52.3701,4.9001\n"
    r = _upload(client, "places.csv", text)
    body = r.json()
    assert body["created"] == 0
    assert body["skipped"] == 1


def test_import_reports_row_errors(client):
    _setup(client)
    text = "name,lat,lng\n,1,2\nGood,bad,coord\n"
    r = _upload(client, "places.csv", text)
    body = r.json()
    assert body["created"] == 0
    reasons = {e["row"]: e["reason"] for e in body["errors"]}
    assert 1 in reasons and 2 in reasons


def test_import_unknown_extension_400(client):
    _setup(client)
    r = _upload(client, "places.txt", "whatever")
    assert r.status_code == 400


def test_import_geojson(client):
    _setup(client)
    fc = {"type": "FeatureCollection", "features": [
        {"type": "Feature", "geometry": {"type": "Point", "coordinates": [4.9, 52.37]},
         "properties": {"name": "GeoCafe", "category": "Food"}}]}
    r = _upload(client, "places.geojson", json.dumps(fc))
    assert r.json()["created"] == 1


def test_export_requires_auth(client):
    assert client.get("/api/pois/export").status_code == 401


def test_export_returns_feature_collection(client):
    _setup(client)
    cat_id = client.post("/api/categories", json={"name": "Food"}).json()["id"]
    client.post("/api/pois", json={"name": "Cafe", "lat": 52.37, "lng": 4.9, "category_id": cat_id})
    r = client.get("/api/pois/export")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/geo+json")
    assert "attachment" in r.headers["content-disposition"]
    assert "minimalpoi-places.geojson" in r.headers["content-disposition"]
    fc = r.json()
    assert fc["type"] == "FeatureCollection"
    assert fc["features"][0]["properties"]["category"] == "Food"


def test_export_empty_db(client):
    _setup(client)
    fc = client.get("/api/pois/export").json()
    assert fc == {"type": "FeatureCollection", "features": []}
