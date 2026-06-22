from sqlmodel import Session, select

from ..models import Category, SyncStatus, Tombstone
from . import mapping, snapshot
from .client import TripClient, TripError


async def reconcile_categories(session: Session, client: TripClient) -> None:
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
