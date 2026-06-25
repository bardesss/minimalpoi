from app.portability import parse_csv, parse_geojson, pois_to_geojson


class _FakePOI:
    def __init__(self, **kw):
        self.__dict__.update(kw)


def test_parse_geojson_point_feature():
    text = """
    {"type":"FeatureCollection","features":[
      {"type":"Feature","geometry":{"type":"Point","coordinates":[4.9,52.37]},
       "properties":{"name":"Cafe","category":"Food","address":"Street 1",
                     "tags":["a","b"],"website":"https://c.example"}}
    ]}
    """
    rows = parse_geojson(text)
    assert len(rows) == 1
    r = rows[0]
    assert r["name"] == "Cafe"
    assert r["lng"] == 4.9 and r["lat"] == 52.37
    assert r["category"] == "Food"
    assert r["tags"] == ["a", "b"]
    assert r["website"] == "https://c.example"
    assert r["phone"] is None


def test_parse_geojson_tags_as_delimited_string():
    text = '{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Point","coordinates":[1,2]},"properties":{"name":"X","tags":"a; b|c"}}]}'
    assert parse_geojson(text)[0]["tags"] == ["a", "b", "c"]


def test_parse_geojson_skips_non_point_and_bad_json():
    text = '{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"LineString","coordinates":[]},"properties":{"name":"Y"}}]}'
    assert parse_geojson(text) == []
    assert parse_geojson("not json") == []


def test_parse_csv_header_aliases_and_tags():
    text = "Name,Latitude,Longitude,Tags\nCafe,52.37,4.9,a;b|c\n"
    rows = parse_csv(text)
    assert len(rows) == 1
    r = rows[0]
    assert r["name"] == "Cafe"
    assert r["lat"] == "52.37" and r["lng"] == "4.9"
    assert r["tags"] == ["a", "b", "c"]


def test_pois_to_geojson_shape_and_category_name():
    poi = _FakePOI(name="Cafe", category_id=7, lat=52.37, lng=4.9, address="A",
                   phone=None, email=None, website="https://c.example", notes=None,
                   tags=["x"], image_url=None, source_url=None)
    fc = pois_to_geojson([poi], {7: "Food"})
    assert fc["type"] == "FeatureCollection"
    feat = fc["features"][0]
    assert feat["geometry"] == {"type": "Point", "coordinates": [4.9, 52.37]}
    assert feat["properties"]["category"] == "Food"
    assert feat["properties"]["name"] == "Cafe"
    assert feat["properties"]["tags"] == ["x"]


def test_pois_to_geojson_null_category():
    poi = _FakePOI(name="Solo", category_id=None, lat=1.0, lng=2.0, address=None,
                   phone=None, email=None, website=None, notes=None, tags=[],
                   image_url=None, source_url=None)
    fc = pois_to_geojson([poi], {})
    assert fc["features"][0]["properties"]["category"] is None


def test_export_import_roundtrip():
    poi = _FakePOI(name="Cafe", category_id=7, lat=52.37, lng=4.9, address="A",
                   phone="123", email="e@x.com", website="https://c.example",
                   notes="n", tags=["x", "y"], image_url=None, source_url="https://s.example")
    fc = pois_to_geojson([poi], {7: "Food"})
    import json
    rows = parse_geojson(json.dumps(fc))
    r = rows[0]
    assert r["name"] == "Cafe" and r["category"] == "Food"
    assert r["lat"] == 52.37 and r["lng"] == 4.9
    assert r["tags"] == ["x", "y"] and r["source_url"] == "https://s.example"
