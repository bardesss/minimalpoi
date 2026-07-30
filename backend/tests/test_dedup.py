from sqlmodel import Session, select

from app import db
from app.dedup import PROXIMITY_THRESHOLD_M, _norm, find_duplicate, haversine_m
from app.models import POI


def _seed(client):
    """Set up an admin plus a spread of POIs covering the tricky dedup cases."""
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    rows = [
        {"name": "Café Modern", "lat": 52.3676, "lng": 4.9041, "source_url": "https://maps.example/cafe"},
        {"name": "Far Bar", "lat": 48.8566, "lng": 2.3522},
        {"name": "Polar Hut", "lat": 78.0, "lng": 15.0},   # high latitude: lng box must widen
        {"name": "!!!", "lat": 10.0, "lng": 10.0},          # unnormalizable name
        {"name": "Twin", "lat": 10.0, "lng": 10.0004},      # ~40 m east of the next
        {"name": "Twin", "lat": 10.0, "lng": 10.0},
    ]
    for r in rows:
        client.post("/api/pois", json=r)


def _old_find_duplicate(session, name, lat, lng, source_url):
    """Verbatim copy of the pre-refactor full scan, kept here as the parity oracle."""
    candidates = session.exec(select(POI)).all()
    if source_url:
        for poi in candidates:
            if poi.source_url and poi.source_url == source_url:
                return poi
    if lat is not None and lng is not None:
        target = _norm(name)
        if target:
            for poi in candidates:
                if _norm(poi.name) == target and haversine_m(lat, lng, poi.lat, poi.lng) <= PROXIMITY_THRESHOLD_M:
                    return poi
    return None


def test_find_duplicate_matches_the_old_full_scan(client):
    _seed(client)
    queries = [
        ("Whatever", None, None, "https://maps.example/cafe"),   # source_url hit
        ("Cafe Modern", 52.3677, 4.9042, None),                  # proximity hit (accent/case fold)
        ("Other Place", 48.0, 2.0, None),                        # far -> miss
        ("Polar Hut", 78.0005, 15.0, None),                      # high-lat proximity hit
        ("!!!", 10.0, 10.0, None),                               # unnormalizable -> never matches
        ("Twin", 10.0, 10.0002, None),                           # between the two Twins
        ("Nope", 10.0, 10.0, "https://nope.example"),            # unknown source_url + name -> miss
    ]
    with Session(db.engine) as s:
        for name, lat, lng, url in queries:
            got = find_duplicate(s, name, lat, lng, url)
            expected = _old_find_duplicate(s, name, lat, lng, url)
            assert (got.id if got else None) == (expected.id if expected else None), (name, lat, lng, url)


def test_find_duplicate_bbox_keeps_a_match_just_inside_threshold(client):
    # ~120 m north of Café Modern (dlat = 120/111320) -> inside 150 m, must match.
    _seed(client)
    with Session(db.engine) as s:
        near_lat = 52.3676 + 120.0 / 111_320.0
        got = find_duplicate(s, "Cafe Modern", near_lat, 4.9041, None)
        assert got is not None and got.name == "Café Modern"


def test_find_duplicate_bbox_excludes_a_match_just_outside_threshold(client):
    # ~250 m north -> outside 150 m, must NOT match.
    _seed(client)
    with Session(db.engine) as s:
        far_lat = 52.3676 + 250.0 / 111_320.0
        assert find_duplicate(s, "Cafe Modern", far_lat, 4.9041, None) is None
