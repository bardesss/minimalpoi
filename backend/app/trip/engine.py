from sqlmodel import Session, select

from ..models import Category, SyncStatus, Tombstone
from . import mapping, snapshot
from .client import TripClient, TripError


async def reconcile_categories(session: Session, client: TripClient) -> None:
    from ..models import Category
    try:
        trip_list = await client.list_categories()
    except TripError:
        return  # whole-pass failure is non-fatal; retried next time
    trip_by_id = {c["id"]: c for c in trip_list}
    tombstoned = {
        t.trip_id for t in session.exec(
            select(Tombstone).where(Tombstone.entity_type == "category")
        ).all()
    }

    # Propagate local deletions (tombstones with origin="local") to TRIP.
    for tomb in session.exec(
        select(Tombstone).where(Tombstone.entity_type == "category", Tombstone.origin == "local")
    ).all():
        try:
            if tomb.trip_id in trip_by_id:
                await client.delete_category(tomb.trip_id)
            session.delete(tomb)  # done — both sides agree it's gone
        except TripError:
            pass  # retry next pass
    session.commit()

    # Detect TRIP-side deletions: a linked Category whose trip id vanished from the pull.
    for cat in session.exec(select(Category)).all():
        if cat.trip_category_id and cat.trip_category_id not in trip_by_id and cat.trip_synced_at is not None:
            session.add(Tombstone(entity_type="category", trip_id=cat.trip_category_id, origin="trip"))
            session.delete(cat)
    session.commit()

    # Import TRIP-only categories.
    linked_ids = {
        c.trip_category_id for c in session.exec(select(Category)).all()
        if c.trip_category_id is not None
    }
    for tid, tcat in trip_by_id.items():
        if tid in linked_ids or tid in tombstoned:
            continue
        fields = mapping.trip_category_to_fields(tcat)
        cat = Category(
            name=fields["name"],
            color=fields["color"] or "#4f46e5",
            created_by=_sync_uid(session),
            trip_category_id=tid,
            trip_synced_snapshot=snapshot.category_snapshot_trip(tcat),
            trip_synced_at=_now(),
            trip_sync_status=SyncStatus.SYNCED,
        )
        session.add(cat)
    session.commit()

    # Push/update/conflict local categories.
    for cat in session.exec(select(Category)).all():
        try:
            await _sync_one_category(session, client, cat, trip_by_id)
        except TripError as exc:
            cat.trip_sync_status = SyncStatus.ERROR
            cat.trip_last_error = str(exc)
            session.add(cat)
    session.commit()


async def _sync_one_category(session, client, cat, trip_by_id) -> None:
    local_snap = snapshot.category_snapshot_local(cat)
    if cat.trip_category_id is None:
        created = await client.create_category(mapping.category_to_trip_payload(cat))
        cat.trip_category_id = created["id"]
        _mark_synced(cat, local_snap)
    else:
        tcat = trip_by_id.get(cat.trip_category_id)
        if tcat is None:
            return  # deletion handled by tombstone logic / next pass
        trip_snap = snapshot.category_snapshot_trip(tcat)
        local_diff = snapshot.local_changed_by_snapshot(local_snap, cat.trip_synced_snapshot)
        trip_diff = snapshot.trip_changed(cat.trip_synced_snapshot, trip_snap)
        if local_diff and not trip_diff:
            await client.update_category(cat.trip_category_id, mapping.category_to_trip_payload(cat))
            _mark_synced(cat, local_snap)
        elif trip_diff and not local_diff:
            fields = mapping.trip_category_to_fields(tcat)
            cat.name, cat.color = fields["name"], fields["color"] or cat.color
            _mark_synced(cat, trip_snap)
        elif local_diff and trip_diff:
            # Conflict: resolve inline (async-safe; no await from a sync helper).
            from ..models import get_or_create_settings
            policy = get_or_create_settings(session).trip_conflict_policy
            if policy == "trip_wins":
                fields = mapping.trip_category_to_fields(tcat)
                cat.name, cat.color = fields["name"], fields["color"] or cat.color
                _mark_synced(cat, trip_snap)
            elif policy == "manual":
                cat.trip_sync_status = SyncStatus.CONFLICT
            else:  # minimalpoi_wins (default)
                await client.update_category(cat.trip_category_id, mapping.category_to_trip_payload(cat))
                _mark_synced(cat, local_snap)
    session.add(cat)


async def reconcile_places(session: Session, client: TripClient) -> None:
    from ..models import POI
    try:
        trip_list = await client.list_places()
    except TripError:
        return
    trip_by_id = {p["id"]: p for p in trip_list}
    cat_by_trip = {
        c.trip_category_id: c for c in session.exec(select(Category)).all()
        if c.trip_category_id is not None
    }
    tombstoned = {
        t.trip_id for t in session.exec(
            select(Tombstone).where(Tombstone.entity_type == "place")
        ).all()
    }

    # Propagate local deletions (tombstones with origin="local") to TRIP.
    for tomb in session.exec(
        select(Tombstone).where(Tombstone.entity_type == "place", Tombstone.origin == "local")
    ).all():
        try:
            if tomb.trip_id in trip_by_id:
                await client.delete_place(tomb.trip_id)
            session.delete(tomb)  # done — both sides agree it's gone
        except TripError:
            pass  # retry next pass
    session.commit()

    # Detect TRIP-side deletions: a linked POI whose trip id vanished from the pull.
    for poi in session.exec(select(POI)).all():
        if poi.trip_place_id and poi.trip_place_id not in trip_by_id and poi.trip_synced_at is not None:
            session.add(Tombstone(entity_type="place", trip_id=poi.trip_place_id, origin="trip"))
            session.delete(poi)
    session.commit()

    linked_ids = {p.trip_place_id for p in session.exec(select(POI)).all() if p.trip_place_id}

    # Import TRIP-only places.
    imported_ids: set[int] = set()
    for tid, tplace in trip_by_id.items():
        if tid in linked_ids or tid in tombstoned:
            continue
        local_cat = cat_by_trip.get((tplace.get("category") or {}).get("id"))
        fields = mapping.trip_place_to_poi_fields(tplace, local_cat.id if local_cat else None)
        poi = POI(created_by=_sync_uid(session), trip_place_id=tid,
                  trip_synced_snapshot=snapshot.place_snapshot_trip(tplace, local_cat.trip_category_id if local_cat else None),
                  trip_synced_at=_now(), trip_sync_status=SyncStatus.SYNCED,
                  **{k: v for k, v in fields.items() if v is not None})
        session.add(poi)
        imported_ids.add(tid)
    session.commit()

    for poi in session.exec(select(POI)).all():
        if poi.created_by is None:
            continue
        if poi.trip_place_id in imported_ids:
            continue
        try:
            await _sync_one_place(session, client, poi, trip_by_id, cat_by_trip)
        except TripError as exc:
            poi.trip_sync_status = SyncStatus.ERROR
            poi.trip_last_error = str(exc)
            session.add(poi)
    session.commit()


async def _sync_one_place(session, client, poi, trip_by_id, cat_by_trip):
    from ..models import Category
    cat = session.get(Category, poi.category_id) if poi.category_id else None
    trip_cat_id = cat.trip_category_id if cat else None
    if poi.trip_place_id is None:
        if trip_cat_id is None:
            poi.trip_sync_status = SyncStatus.PENDING  # category not synced yet; defer
            session.add(poi)
            return
        payload = mapping.poi_to_trip_payload(poi, trip_cat_id, include_image=True)
        created = await client.create_place(payload)
        poi.trip_place_id = created["id"]
        _mark_synced(poi, snapshot.place_snapshot_local(poi, trip_cat_id))
    else:
        tplace = trip_by_id.get(poi.trip_place_id)
        if tplace is None:
            return
        local_snap = snapshot.place_snapshot_local(poi, trip_cat_id)
        trip_snap = snapshot.place_snapshot_trip(tplace, trip_cat_id)
        local_diff = snapshot.local_changed(poi.updated_at, poi.trip_synced_at)
        trip_diff = snapshot.trip_changed(poi.trip_synced_snapshot, trip_snap)
        if local_diff and not trip_diff:
            await client.update_place(poi.trip_place_id, mapping.poi_to_trip_payload(poi, trip_cat_id, include_image=True))
            _mark_synced(poi, local_snap)
        elif trip_diff and not local_diff:
            _apply_trip_to_poi(session, poi, tplace, cat_by_trip)
            _mark_synced(poi, trip_snap)
        elif local_diff and trip_diff:
            await _resolve_place_conflict(session, client, poi, tplace, cat_by_trip, local_snap, trip_snap, trip_cat_id)
    session.add(poi)


def _apply_trip_to_poi(session, poi, tplace, cat_by_trip):
    local_cat = cat_by_trip.get((tplace.get("category") or {}).get("id"))
    fields = mapping.trip_place_to_poi_fields(tplace, local_cat.id if local_cat else poi.category_id)
    for key, value in fields.items():
        setattr(poi, key, value)


async def _resolve_place_conflict(session, client, poi, tplace, cat_by_trip, local_snap, trip_snap, trip_cat_id):
    from ..models import get_or_create_settings
    policy = get_or_create_settings(session).trip_conflict_policy
    if policy == "trip_wins":
        _apply_trip_to_poi(session, poi, tplace, cat_by_trip)
        _mark_synced(poi, trip_snap)
    elif policy == "manual":
        poi.trip_sync_status = SyncStatus.CONFLICT
    else:  # minimalpoi_wins
        await client.update_place(poi.trip_place_id, mapping.poi_to_trip_payload(poi, trip_cat_id, include_image=True))
        _mark_synced(poi, local_snap)


def _mark_synced(entity, snap):
    entity.trip_synced_snapshot = snap
    entity.trip_synced_at = _now()
    entity.trip_sync_status = SyncStatus.SYNCED
    entity.trip_last_error = None


def _now():
    from ..models import utcnow
    return utcnow()


def _sync_uid(session) -> int:
    from ..models import sync_system_user
    return sync_system_user(session).id
