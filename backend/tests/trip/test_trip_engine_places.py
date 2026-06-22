import pytest
from sqlmodel import Session, select

from app import db
from app.models import POI, Category, SyncStatus
from app.trip.engine import reconcile_categories, reconcile_places


async def _seed_category(session, tc):
    session.add(Category(name="Food", color="#fff", created_by=1))
    session.commit()
    await reconcile_categories(session, tc)
    return session.exec(select(Category)).first()


@pytest.mark.anyio
async def test_local_poi_created_in_trip(client, trip_client, fake_trip):
    tc, http = trip_client
    with Session(db.engine) as session:
        cat = await _seed_category(session, tc)
        session.add(POI(name="Cafe", lat=1.0, lng=2.0, address="A", category_id=cat.id, created_by=1))
        session.commit()
        await reconcile_places(session, tc)
        poi = session.exec(select(POI)).first()
        assert poi.trip_place_id is not None
        assert poi.trip_sync_status == SyncStatus.SYNCED
    await http.aclose()
    assert any(p["name"] == "Cafe" for p in fake_trip.places.values())


@pytest.mark.anyio
async def test_trip_only_place_imported(client, trip_client, fake_trip):
    tc, http = trip_client
    with Session(db.engine) as session:
        cat = await _seed_category(session, tc)
        fake_trip.places[50] = {"id": 50, "name": "Bar", "lat": 3.0, "lng": 4.0, "place": "B",
                                "category": {"id": cat.trip_category_id, "name": "Food", "color": "#fff"},
                                "links": [], "image": None, "description": None}
        await reconcile_places(session, tc)
        poi = session.exec(select(POI).where(POI.trip_place_id == 50)).first()
        assert poi is not None and poi.name == "Bar" and poi.category_id == cat.id
    await http.aclose()


@pytest.mark.anyio
async def test_import_does_not_push_back(client, trip_client, fake_trip):
    tc, http = trip_client
    with Session(db.engine) as session:
        cat = await _seed_category(session, tc)
        fake_trip.places[60] = {"id": 60, "name": "Imported", "lat": 1.0, "lng": 2.0, "place": "P",
                                "category": {"id": cat.trip_category_id, "name": "Food", "color": "#fff"},
                                "links": [], "image": None, "description": None}
        before = dict(fake_trip.places[60])
        await reconcile_places(session, tc)
        # imported POI is synced, and the TRIP place was NOT modified by a push-back
        poi = session.exec(select(POI).where(POI.trip_place_id == 60)).first()
        assert poi.trip_sync_status == SyncStatus.SYNCED
        assert fake_trip.places[60] == before  # unchanged — no needless PUT
    await http.aclose()
