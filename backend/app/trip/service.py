import asyncio
import logging

import httpx
from sqlmodel import Session, select

from .. import db as _db
from ..crypto import decrypt
from ..models import POI, SyncStatus, get_or_create_settings, utcnow
from .client import TripClient
from .engine import reconcile_categories, reconcile_places

logger = logging.getLogger(__name__)


def _configured(s) -> bool:
    return bool(s.trip_sync_enabled and s.trip_base_url and s.trip_username and s.trip_password_enc)


async def build_client(session: Session) -> TripClient | None:
    s = get_or_create_settings(session)
    if not _configured(s):
        return None
    http = httpx.AsyncClient(timeout=20.0)
    return TripClient(s.trip_base_url, s.trip_username, decrypt(s.trip_password_enc), http)


async def run_sync(session: Session, client: TripClient | None = None) -> dict:
    s = get_or_create_settings(session)
    owns = client is None
    http = None
    if client is None:
        if not _configured(s):
            return {"ran": False}
        http = httpx.AsyncClient(timeout=20.0)
        client = TripClient(s.trip_base_url, s.trip_username, decrypt(s.trip_password_enc), http)
    try:
        await reconcile_categories(session, client)
        await reconcile_places(session, client)
    finally:
        if owns and http is not None:
            await http.aclose()
    s.trip_last_sync_at = utcnow()
    session.add(s)
    session.commit()
    errors = len(session.exec(select(POI).where(POI.trip_sync_status == SyncStatus.ERROR)).all())
    return {"ran": True, "errors": errors}


async def _worker_loop(app) -> None:
    """Background worker: runs run_sync every trip_sync_interval_seconds.

    Sleeps FIRST before each run so that short-lived test sessions never
    trigger a real sync — the sleep is cancelled on shutdown before any work.
    """
    while True:
        # Determine the sleep interval (and whether sync is enabled) from settings.
        # Access _db.engine via the module so we always get the current engine (tests reset it).
        interval = 300
        enabled = False
        try:
            with Session(_db.engine) as sess:
                s = get_or_create_settings(sess)
                interval = s.trip_sync_interval_seconds
                enabled = s.trip_sync_enabled
        except Exception as exc:
            logger.warning("sync worker settings read failed: %s", exc)

        # Sleep before running — cancellation during sleep is normal on shutdown.
        await asyncio.sleep(interval)

        if not enabled:
            continue

        try:
            with Session(_db.engine) as sess:
                await run_sync(sess)
        except Exception as exc:
            logger.warning("Sync worker error (will retry): %s", exc)


def start_worker(app) -> None:
    """Create and store the background worker task on app.state."""
    loop = asyncio.get_running_loop()
    app.state.sync_worker = loop.create_task(_worker_loop(app))


def stop_worker(app) -> None:
    """Cancel the background worker task (call from lifespan shutdown)."""
    task = getattr(app.state, "sync_worker", None)
    if task is not None:
        task.cancel()
