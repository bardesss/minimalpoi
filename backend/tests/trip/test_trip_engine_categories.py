import pytest
from sqlmodel import Session, select

from app import db
from app.models import Category, SyncStatus
from app.trip.engine import reconcile_categories


@pytest.mark.anyio
async def test_local_category_created_in_trip(client, trip_client, fake_trip):
    tc, http = trip_client
    with Session(db.engine) as session:
        session.add(Category(name="Food", color="#2F9E63", created_by=1))
        session.commit()
        await reconcile_categories(session, tc)
        cat = session.exec(select(Category)).first()
        assert cat.trip_category_id is not None
        assert cat.trip_sync_status == SyncStatus.SYNCED
    await http.aclose()
    assert any(c["name"] == "Food" for c in fake_trip.categories.values())


@pytest.mark.anyio
async def test_trip_only_category_imported(client, trip_client, fake_trip):
    tc, http = trip_client
    fake_trip.categories[99] = {"id": 99, "name": "Museums", "color": "#7C5CC4"}
    with Session(db.engine) as session:
        await reconcile_categories(session, tc)
        cat = session.exec(select(Category).where(Category.trip_category_id == 99)).first()
        assert cat is not None and cat.name == "Museums" and cat.icon is None
    await http.aclose()
