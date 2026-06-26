from fastapi import APIRouter, HTTPException
from sqlmodel import select

from ..deps import AdminUser, CurrentUser, SessionDep
from ..models import POI, Category, SyncStatus, get_or_create_settings, utcnow
from ..schemas import SyncConflictRead, SyncResolve, SyncStatusRead
from ..trip.resolve import apply_category_snapshot, apply_place_snapshot
from ..trip.service import run_sync

router = APIRouter(prefix="/api/sync", tags=["sync"])

_BAD = (SyncStatus.CONFLICT, SyncStatus.ERROR)


@router.post("/now")
async def sync_now(session: SessionDep, _: AdminUser) -> dict:
    return await run_sync(session)


@router.get("/status", response_model=SyncStatusRead)
def sync_status(session: SessionDep, _: CurrentUser) -> SyncStatusRead:
    s = get_or_create_settings(session)
    error_count = len(session.exec(select(POI).where(POI.trip_sync_status == SyncStatus.ERROR)).all()) \
                + len(session.exec(select(Category).where(Category.trip_sync_status == SyncStatus.ERROR)).all())
    conflict_count = len(session.exec(select(POI).where(POI.trip_sync_status == SyncStatus.CONFLICT)).all()) \
                   + len(session.exec(select(Category).where(Category.trip_sync_status == SyncStatus.CONFLICT)).all())
    return SyncStatusRead(enabled=bool(s.trip_sync_enabled), last_run=s.trip_last_sync_at,
                          error_count=error_count, conflict_count=conflict_count)


def _list_conflicts(session) -> list[SyncConflictRead]:
    out: list[SyncConflictRead] = []
    for p in session.exec(select(POI).where(POI.trip_sync_status.in_(_BAD))).all():
        out.append(SyncConflictRead(entity_type="place", id=p.id, name=p.name,
                                    trip_id=p.trip_place_id, status=p.trip_sync_status.value,
                                    last_error=p.trip_last_error))
    for c in session.exec(select(Category).where(Category.trip_sync_status.in_(_BAD))).all():
        out.append(SyncConflictRead(entity_type="category", id=c.id, name=c.name,
                                    trip_id=c.trip_category_id, status=c.trip_sync_status.value,
                                    last_error=c.trip_last_error))
    return out


@router.get("/conflicts", response_model=list[SyncConflictRead])
def list_conflicts(session: SessionDep, _: AdminUser) -> list[SyncConflictRead]:
    return _list_conflicts(session)


@router.post("/resolve", response_model=list[SyncConflictRead])
def resolve_conflict(body: SyncResolve, session: SessionDep, _: AdminUser) -> list[SyncConflictRead]:
    model = POI if body.entity_type == "place" else Category
    entity = session.get(model, body.id)
    if entity is None or entity.trip_sync_status not in _BAD:
        raise HTTPException(status_code=404, detail="No such conflict")

    if body.resolution == "local":
        entity.trip_sync_status = SyncStatus.PENDING
        entity.trip_last_error = None
    elif body.resolution == "trip":
        snap = entity.trip_synced_snapshot
        if snap is None:
            raise HTTPException(status_code=409, detail="No TRIP snapshot to apply")
        if body.entity_type == "place":
            local_cat_id = None
            trip_cat_id = snap.get("category_id")
            if trip_cat_id is not None:
                cat = session.exec(
                    select(Category).where(Category.trip_category_id == trip_cat_id)
                ).first()
                local_cat_id = cat.id if cat else None
            apply_place_snapshot(entity, snap, local_cat_id)
        else:
            apply_category_snapshot(entity, snap)
        entity.trip_sync_status = SyncStatus.SYNCED
        entity.trip_synced_at = utcnow()
        entity.trip_last_error = None
    else:
        raise HTTPException(status_code=422, detail="resolution must be 'local' or 'trip'")

    session.add(entity)
    session.commit()
    return _list_conflicts(session)
