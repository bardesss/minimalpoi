import pytest
from sqlmodel import Session, select

from app import db
from app.models import POI, Category, SyncStatus, Tombstone, get_or_create_settings
from app.trip.engine import reconcile_categories, reconcile_places


async def _synced_poi(session, tc, fake_trip):
    session.add(Category(name="Food", color="#fff", created_by=1)); session.commit()
    await reconcile_categories(session, tc)
    cat = session.exec(select(Category)).first()
    session.add(POI(name="Cafe", lat=1.0, lng=2.0, address="A", category_id=cat.id, created_by=1)); session.commit()
    await reconcile_places(session, tc)
    return session.exec(select(POI)).first()


@pytest.mark.anyio
async def test_local_delete_propagates(client, trip_client, fake_trip):
    tc, http = trip_client
    with Session(db.engine) as session:
        poi = await _synced_poi(session, tc, fake_trip)
        tid = poi.trip_place_id
        # user deleted the POI -> Plan 1 wrote a local tombstone; simulate:
        session.add(Tombstone(entity_type="place", trip_id=tid, origin="local"))
        session.delete(poi); session.commit()
        await reconcile_places(session, tc)
    await http.aclose()
    assert tid not in fake_trip.places  # deleted in TRIP
    with Session(db.engine) as session:
        assert session.exec(select(Tombstone).where(Tombstone.trip_id == tid)).first() is None  # cleared


@pytest.mark.anyio
async def test_trip_delete_removes_local(client, trip_client, fake_trip):
    tc, http = trip_client
    with Session(db.engine) as session:
        poi = await _synced_poi(session, tc, fake_trip)
        tid = poi.trip_place_id
        fake_trip.places.pop(tid)  # deleted on TRIP side
        await reconcile_places(session, tc)
        assert session.exec(select(POI).where(POI.trip_place_id == tid)).first() is None
    await http.aclose()


@pytest.mark.anyio
async def test_conflict_minimalpoi_wins(client, trip_client, fake_trip):
    tc, http = trip_client
    with Session(db.engine) as session:
        poi = await _synced_poi(session, tc, fake_trip)
        tid = poi.trip_place_id
        # both sides change:
        poi.name = "LocalName"; from app.models import utcnow; poi.updated_at = utcnow(); session.add(poi); session.commit()
        fake_trip.places[tid]["name"] = "TripName"
        await reconcile_places(session, tc)
        session.refresh(poi)
        assert poi.trip_sync_status == SyncStatus.SYNCED
    await http.aclose()
    assert fake_trip.places[tid]["name"] == "LocalName"  # local won


@pytest.mark.anyio
async def test_conflict_manual_flags(client, trip_client, fake_trip):
    tc, http = trip_client
    with Session(db.engine) as session:
        get_or_create_settings(session).trip_conflict_policy = "manual"; session.commit()
        poi = await _synced_poi(session, tc, fake_trip)
        tid = poi.trip_place_id
        poi.name = "LocalName"; from app.models import utcnow; poi.updated_at = utcnow(); session.add(poi); session.commit()
        fake_trip.places[tid]["name"] = "TripName"
        await reconcile_places(session, tc)
        session.refresh(poi)
        assert poi.trip_sync_status == SyncStatus.CONFLICT
    await http.aclose()
    assert fake_trip.places[tid]["name"] == "TripName"  # neither side changed


async def _synced_category(session, tc):
    session.add(Category(name="Food", color="#fff", created_by=1))
    session.commit()
    await reconcile_categories(session, tc)
    return session.exec(select(Category)).first()


@pytest.mark.anyio
async def test_local_category_delete_propagates(client, trip_client, fake_trip):
    tc, http = trip_client
    with Session(db.engine) as session:
        cat = await _synced_category(session, tc)
        tid = cat.trip_category_id
        session.add(Tombstone(entity_type="category", trip_id=tid, origin="local"))
        session.delete(cat); session.commit()
        await reconcile_categories(session, tc)
    await http.aclose()
    assert tid not in fake_trip.categories
    with Session(db.engine) as session:
        assert session.exec(select(Tombstone).where(
            Tombstone.entity_type == "category", Tombstone.trip_id == tid)).first() is None


@pytest.mark.anyio
async def test_trip_category_delete_removes_local(client, trip_client, fake_trip):
    tc, http = trip_client
    with Session(db.engine) as session:
        cat = await _synced_category(session, tc)
        tid = cat.trip_category_id
        fake_trip.categories.pop(tid)
        await reconcile_categories(session, tc)
        assert session.exec(select(Category).where(Category.trip_category_id == tid)).first() is None
    await http.aclose()


@pytest.mark.anyio
async def test_category_conflict_minimalpoi_wins(client, trip_client, fake_trip):
    tc, http = trip_client
    with Session(db.engine) as session:
        cat = await _synced_category(session, tc)
        tid = cat.trip_category_id
        cat.color = "#localcolor"; session.add(cat); session.commit()   # local change
        fake_trip.categories[tid]["color"] = "#tripcolor"               # trip change
        await reconcile_categories(session, tc)
        session.refresh(cat)
        assert cat.trip_sync_status == SyncStatus.SYNCED
    await http.aclose()
    assert fake_trip.categories[tid]["color"] == "#localcolor"          # MinimalPOI won


@pytest.mark.anyio
async def test_inbound_trip_edit_applies_and_idempotent(client, trip_client, fake_trip):
    tc, http = trip_client
    with Session(db.engine) as session:
        poi = await _synced_poi(session, tc, fake_trip)
        tid = poi.trip_place_id
        poi.notes = "LOCAL NOTE"; session.add(poi); session.commit()
        await reconcile_places(session, tc)  # baseline so notes is synced
        # Now TRIP edits the name only (no local change):
        fake_trip.places[tid]["name"] = "TripRenamed"
        await reconcile_places(session, tc)
        session.refresh(poi)
        assert poi.name == "TripRenamed"      # inbound applied
        assert poi.trip_sync_status == SyncStatus.SYNCED
        # idempotent: second pass makes no change to TRIP
        before = dict(fake_trip.places[tid])
        await reconcile_places(session, tc)
        assert fake_trip.places[tid] == before
    await http.aclose()


@pytest.mark.anyio
async def test_conflict_trip_wins(client, trip_client, fake_trip):
    tc, http = trip_client
    with Session(db.engine) as session:
        get_or_create_settings(session).trip_conflict_policy = "trip_wins"; session.commit()
        poi = await _synced_poi(session, tc, fake_trip)
        tid = poi.trip_place_id
        from app.models import utcnow
        poi.name = "LocalName"; poi.updated_at = utcnow(); session.add(poi); session.commit()
        fake_trip.places[tid]["name"] = "TripName"
        await reconcile_places(session, tc)
        session.refresh(poi)
        assert poi.name == "TripName"   # trip won
        assert poi.trip_sync_status == SyncStatus.SYNCED
    await http.aclose()
