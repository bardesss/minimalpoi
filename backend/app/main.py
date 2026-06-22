from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from . import db
from .enrich.images import images_dir
from .routers import auth, categories, comments, enrich, images, pois, settings, teams, users, visits, wishlist


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    yield


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
app.mount("/images", StaticFiles(directory=str(images_dir())), name="images")


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
