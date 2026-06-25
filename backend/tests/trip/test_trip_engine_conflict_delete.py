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
    """A place deleted on TRIP is removed locally — when the pull still returns the
    other synced places (a non-empty pull, so the deletion guard allows it)."""
    tc, http = trip_client
    with Session(db.engine) as session:
        session.add(Category(name="Food", color="#fff", created_by=1)); session.commit()
        await reconcile_categories(session, tc)
        cat = session.exec(select(Category)).first()
        session.add(POI(name="Cafe", lat=1.0, lng=2.0, address="A", category_id=cat.id, created_by=1))
        session.add(POI(name="Bar", lat=3.0, lng=4.0, address="B", category_id=cat.id, created_by=1))
        session.commit()
        await reconcile_places(session, tc)
        gone_tid = session.exec(select(POI)).all()[0].trip_place_id
        fake_trip.places.pop(gone_tid)  # one deleted on TRIP; the other remains
        await reconcile_places(session, tc)
        assert session.exec(select(POI).where(POI.trip_place_id == gone_tid)).first() is None
        assert len(session.exec(select(POI)).all()) == 1  # the other survived
    await http.aclose()


@pytest.mark.anyio
async def test_empty_place_pull_keeps_local(client, trip_client, fake_trip):
    """An empty places pull (transient error / scoping / auth) must NOT delete
    synced POIs — guarding against the mass-wipe that destroyed real data."""
    tc, http = trip_client
    with Session(db.engine) as session:
        poi = await _synced_poi(session, tc, fake_trip)
        tid = poi.trip_place_id
        fake_trip.places.clear()  # pull now returns []
        await reconcile_places(session, tc)
        assert session.exec(select(POI).where(POI.trip_place_id == tid)).first() is not None
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
async def test_local_category_delete_is_local_only(client, trip_client, fake_trip):
    """Deleting a category locally must NOT delete it on TRIP — that cascade-deletes
    the category's places (the data-loss bug). The category stays on TRIP; the
    origin='local' tombstone persists so it doesn't re-import."""
    tc, http = trip_client
    with Session(db.engine) as session:
        cat = await _synced_category(session, tc)
        tid = cat.trip_category_id
        session.add(Tombstone(entity_type="category", trip_id=tid, origin="local"))
        session.delete(cat); session.commit()
        await reconcile_categories(session, tc)
    await http.aclose()
    assert tid in fake_trip.categories  # NOT deleted on TRIP (no cascade)
    with Session(db.engine) as session:
        # tombstone persists -> category is not re-imported
        assert session.exec(select(Tombstone).where(
            Tombstone.entity_type == "category", Tombstone.trip_id == tid)).first() is not None
        assert session.exec(select(Category).where(Category.trip_category_id == tid)).first() is None


@pytest.mark.anyio
async def test_trip_category_delete_removes_local(client, trip_client, fake_trip):
    """A category deleted on TRIP is removed locally when the pull still returns
    other categories (non-empty pull)."""
    tc, http = trip_client
    with Session(db.engine) as session:
        session.add(Category(name="Food", color="#fff", created_by=1))
        session.add(Category(name="Nature", color="#0f0", created_by=1))
        session.commit()
        await reconcile_categories(session, tc)
        gone_tid = session.exec(select(Category)).all()[0].trip_category_id
        fake_trip.categories.pop(gone_tid)  # one deleted on TRIP; the other remains
        await reconcile_categories(session, tc)
        assert session.exec(select(Category).where(Category.trip_category_id == gone_tid)).first() is None
        assert len(session.exec(select(Category)).all()) == 1
    await http.aclose()


@pytest.mark.anyio
async def test_empty_category_pull_keeps_local(client, trip_client, fake_trip):
    """An empty categories pull must NOT delete synced categories."""
    tc, http = trip_client
    with Session(db.engine) as session:
        cat = await _synced_category(session, tc)
        tid = cat.trip_category_id
        fake_trip.categories.clear()  # pull now returns []
        await reconcile_categories(session, tc)
        assert session.exec(select(Category).where(Category.trip_category_id == tid)).first() is not None
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
