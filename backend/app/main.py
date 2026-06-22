from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from . import db
from .enrich.images import images_dir
from .routers import auth, categories, comments, enrich, images, pois, settings, teams, users, visits, wishlist
from .routers import sync as sync_router_module
from .trip.service import start_worker, stop_worker


@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio
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
app.include_router(sync_router_module.router)
app.mount("/images", StaticFiles(directory=str(images_dir())), name="images")


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
