import pytest
from sqlmodel import Session, select

from app import db
from app.models import POI, Category
from app.trip.engine import reconcile_categories, reconcile_places


@pytest.mark.anyio
async def test_existing_match_is_linked_not_duplicated(client, trip_client, fake_trip):
    tc, http = trip_client
    with Session(db.engine) as session:
        session.add(Category(name="Food", color="#fff", created_by=1)); session.commit()
        await reconcile_categories(session, tc)
        cat = session.exec(select(Category)).first()
        # Local POI and an equivalent TRIP place both exist, unlinked.
        session.add(POI(name="Cafe Modern", lat=52.3676, lng=4.9041, address="A", category_id=cat.id, created_by=1))
        session.commit()
        fake_trip.places[70] = {"id": 70, "name": "Cafe Modern", "lat": 52.3677, "lng": 4.9042, "place": "A",
                                "category": {"id": cat.trip_category_id, "name": "Food", "color": "#fff"},
                                "links": [], "image": None, "description": None}
        await reconcile_places(session, tc)
        pois = session.exec(select(POI)).all()
        assert len(pois) == 1  # linked, not duplicated
        assert pois[0].trip_place_id == 70
    await http.aclose()
    assert len(fake_trip.places) == 1  # no new place created in TRIP either
