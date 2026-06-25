import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import db
from .enrich.images import images_dir
from .routers import auth, categories, comments, enrich, images, pois, settings, tags, teams, users, visits, wishlist
from .routers import sync as sync_router_module
from .trip.service import start_worker, stop_worker


def spa_dist_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    start_worker(app)
    try:
        yield
    finally:
        stop_worker(app)
        task = getattr(app.state, "sync_worker", None)
        if task is not None:
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass


app = FastAPI(title="MinimalPOI", lifespan=lifespan)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(teams.router)
app.include_router(categories.router)
app.include_router(pois.router)
app.include_router(visits.router)
app.include_router(wishlist.router)
app.include_router(comments.router)
app.include_router(settings.router)
app.include_router(enrich.router)
app.include_router(images.router)
app.include_router(tags.router)
app.include_router(sync_router_module.router)
app.mount("/images", StaticFiles(directory=str(images_dir())), name="images")


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


_dist = spa_dist_dir()
if (_dist / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=str(_dist / "assets")), name="assets")

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str) -> FileResponse:
        # Registered last: all API and static routes above match first; only
        # unmatched client-side routes fall through to the SPA entry point.
        return FileResponse(str(_dist / "index.html"))
