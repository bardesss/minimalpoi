from fastapi import APIRouter
from sqlmodel import select

from ..deps import AdminUser, CurrentUser, SessionDep
from ..models import POI, SyncStatus, get_or_create_settings
from ..schemas import SyncStatusRead
from ..trip.service import run_sync

router = APIRouter(prefix="/api/sync", tags=["sync"])


@router.post("/now")
async def sync_now(session: SessionDep, _: AdminUser) -> dict:
    return await run_sync(session)


@router.get("/status", response_model=SyncStatusRead)
def sync_status(session: SessionDep, _: CurrentUser) -> SyncStatusRead:
    s = get_or_create_settings(session)
    errors = len(session.exec(select(POI).where(POI.trip_sync_status == SyncStatus.ERROR)).all())
    conflicts = len(session.exec(select(POI).where(POI.trip_sync_status == SyncStatus.CONFLICT)).all())
    return SyncStatusRead(enabled=bool(s.trip_sync_enabled), last_run=None,
                          error_count=errors, conflict_count=conflicts)
