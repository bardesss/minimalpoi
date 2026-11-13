import io
import json

import pytest


def _setup(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    client.patch("/api/settings", json={"routes_enabled": True})


@pytest.mark.parametrize(
    "override",
    [
        {"lat": 500},
        {"lng": -181},
        {"lat": float("nan")},
        {"lng": float("inf")},
        {"name": ""},
        {"name": "   "},
        {"name": "x" * 201},
        {"notes": "x" * 10_001},
        {"tags": ["t"] * 51},
        {"tags": ["x" * 51]},
    ],
)
def test_poi_create_rejects(client, override):
    _setup(client)
    body = {"name": "Cafe", "lat": 1.0, "lng": 2.0, **override}
    # json.dumps emits NaN/Infinity tokens, which the server must also reject.
    r = client.post("/api/pois", content=json.dumps(body), headers={"content-type": "application/json"})
    assert r.status_code == 422


def test_poi_patch_rejects_out_of_range_and_null_name(client):
    _setup(client)
    pid = client.post("/api/pois", json={"name": "A", "lat": 1, "lng": 2}).json()["id"]
    assert client.patch(f"/api/pois/{pid}", json={"lat": 91}).status_code == 422
    assert client.patch(f"/api/pois/{pid}", json={"name": None}).status_code == 422
    assert client.patch(f"/api/pois/{pid}", json={"notes": None}).status_code == 200


def test_node_nights_negative_422(client):
    _setup(client)
    rid = client.post("/api/routes", json={"name": "R", "start_date": "2030-01-01"}).json()["id"]
    r = client.post(
        f"/api/routes/{rid}/nodes",
        json={"kind": "stay", "name": "Inn", "lat": 1, "lng": 2, "nights": -1},
    )
    assert r.status_code == 422
    r = client.post(
        f"/api/routes/{rid}/nodes",
        json={"kind": "stay", "name": "Inn", "lat": 1, "lng": 2, "nights": 366},
    )
    assert r.status_code == 422


def test_settings_map_center_range(client):
    _setup(client)
    assert client.patch("/api/settings", json={"default_map_center_lat": 95}).status_code == 422


def _upload(client, filename, content):
    return client.post(
        "/api/pois/import",
        files={"file": (filename, io.BytesIO(content.encode()), "application/octet-stream")},
    )


def _feature(**props):
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [4.9, 52.37]},
        "properties": props,
    }


def test_geojson_import_numeric_name_reports_row_error(client):
    _setup(client)
    fc = {"type": "FeatureCollection", "features": [_feature(name=123), _feature(name="Ok")]}
    r = _upload(client, "x.geojson", json.dumps(fc))
    assert r.status_code == 200
    body = r.json()
    assert body["created"] == 1
    assert [e["row"] for e in body["errors"]] == [1]


def test_geojson_import_object_address_reports_row_error(client):
    _setup(client)
    fc = {
        "type": "FeatureCollection",
        "features": [_feature(name="Bad", address={"street": "x"}), _feature(name="Ok")],
    }
    r = _upload(client, "x.geojson", json.dumps(fc))
    assert r.status_code == 200
    body = r.json()
    assert body["created"] == 1
    assert [e["row"] for e in body["errors"]] == [1]


def test_import_out_of_range_coords_row_error(client):
    _setup(client)
    r = _upload(client, "x.csv", "name,lat,lng\nA,95,2\nB,nan,2\nC,1,2\n")
    body = r.json()
    assert body["created"] == 1
    assert [e["row"] for e in body["errors"]] == [1, 2]


def test_import_non_http_image_url_not_stored(client):
    _setup(client)
    r = _upload(client, "x.csv", "name,lat,lng,image_url\nA,1,2,javascript:alert(1)\n")
    assert r.json()["created"] == 1
    assert client.get("/api/pois").json()[0]["image_url"] is None
