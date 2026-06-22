from contextlib import asynccontextmanager

from fastapi import FastAPI

from . import db
from .routers import auth, categories, pois, teams, users


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


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
