from app.trip import snapshot


class _Obj:
    def __init__(self, **kw):
        self.__dict__.update(kw)


def test_place_snapshots_align():
    poi = _Obj(name="A", lat=1.0, lng=2.0, address="addr", notes="n",
               website="https://w", phone=None, email=None)
    trip = {"name": "A", "lat": 1.0, "lng": 2.0, "place": "addr", "description": "n",
            "links": ["https://w"], "image": "ignored"}
    assert snapshot.place_snapshot_local(poi, 5) == snapshot.place_snapshot_trip(trip, 5)


def test_trip_changed_detects_diff():
    base = {"name": "A"}
    assert snapshot.trip_changed(base, {"name": "A"}) is False
    assert snapshot.trip_changed(base, {"name": "B"}) is True
    assert snapshot.trip_changed(None, {"name": "A"}) is True


def test_local_changed_by_timestamp():
    from datetime import datetime, timedelta, timezone
    t0 = datetime(2026, 1, 1, tzinfo=timezone.utc)
    assert snapshot.local_changed(updated_at=t0 + timedelta(minutes=1), trip_synced_at=t0) is True
    assert snapshot.local_changed(updated_at=t0, trip_synced_at=t0 + timedelta(minutes=1)) is False
    assert snapshot.local_changed(updated_at=t0, trip_synced_at=None) is True


def test_category_snapshots():
    cat = _Obj(name="Food", color="#abc")
    assert snapshot.category_snapshot_local(cat) == {"name": "Food", "color": "#abc"}
    assert snapshot.category_snapshot_trip({"name": "Food", "color": "#abc"}) == {"name": "Food", "color": "#abc"}
