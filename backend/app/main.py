from contextlib import asynccontextmanager

from fastapi import FastAPI

from . import db
from .routers import auth, categories, comments, pois, teams, users, visits, wishlist


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


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
