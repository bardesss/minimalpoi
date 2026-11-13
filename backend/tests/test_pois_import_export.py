import io
import json


def _setup(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})


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


def test_import_rejects_oversized_upload(client):
    _setup(client)
    from app.routers.pois import MAX_IMPORT_BYTES

    header = "name,lat,lng\n"
    big = header + ("X,1,2\n" * ((MAX_IMPORT_BYTES // 6) + 1))
    assert len(big.encode("utf-8")) > MAX_IMPORT_BYTES
    r = _upload(client, "places.csv", big)
    assert r.status_code == 413


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


def _geojson(rows):
    return json.dumps({"type": "FeatureCollection", "features": [
        {"type": "Feature", "geometry": {"type": "Point", "coordinates": [lng, lat]},
         "properties": {"name": name, **props}}
        for name, lat, lng, props in rows
    ]})


def test_import_caps_remote_image_fetches(client, monkeypatch):
    from app.routers import pois as pois_router

    fetched = []

    async def fake_localize(url):
        fetched.append(url)
        return "/images/x.webp" if url and url.startswith("http") else url

    monkeypatch.setattr(pois_router, "localize", fake_localize)
    monkeypatch.setattr(pois_router, "IMPORT_MAX_REMOTE_IMAGES", 2)
    _setup(client)
    rows = [(f"P{i}", 50 + i, 4.0, {"image_url": f"https://img.example/{i}.jpg"}) for i in range(4)]
    rows.append(("Local", 60.0, 4.0, {"image_url": "/images/keep.webp"}))
    r = _upload(client, "p.geojson", _geojson(rows))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["created"] == 5
    assert body["images_skipped"] == 2
    assert [u for u in fetched if u.startswith("http")] == ["https://img.example/0.jpg", "https://img.example/1.jpg"]
    images = {p["name"]: p["image_url"] for p in client.get("/api/pois").json()}
    assert images == {"P0": "/images/x.webp", "P1": "/images/x.webp", "P2": None, "P3": None,
                      "Local": "/images/keep.webp"}


def test_import_fetches_images_before_any_write(client, monkeypatch):
    from sqlalchemy import event
    from sqlmodel import Session

    from app import db
    from app.models import Category
    from app.routers import pois as pois_router

    log = []

    def on_flush(session, ctx):
        if not session.info.get("probe"):
            log.append("flush")

    async def fake_localize(url):
        log.append("localize")
        # A concurrent writer must not be blocked by the import (SQLite would
        # raise "database is locked" if the import already held the write lock).
        with Session(db.engine) as other:
            other.info["probe"] = True
            other.add(Category(name=f"probe-{len(log)}", created_by=1))
            other.commit()
        return "/images/x.webp"

    monkeypatch.setattr(pois_router, "localize", fake_localize)
    _setup(client)
    event.listen(Session, "after_flush", on_flush)
    try:
        rows = [(f"P{i}", 50 + i, 4.0, {"image_url": f"https://img.example/{i}.jpg", "category": "New"})
                for i in range(2)]
        r = _upload(client, "p.geojson", _geojson(rows))
    finally:
        event.remove(Session, "after_flush", on_flush)
    assert r.status_code == 200, r.text
    assert r.json()["created"] == 2
    assert log.count("localize") == 2
    assert "flush" in log
    assert log.index("flush") > max(i for i, e in enumerate(log) if e == "localize")


def test_import_skips_duplicates_within_the_same_file(client):
    _setup(client)
    rows = [("Cafe", 52.37, 4.9, {}), ("Cafe", 52.37, 4.9, {})]
    body = _upload(client, "p.geojson", _geojson(rows)).json()
    assert body["created"] == 1 and body["skipped"] == 1
