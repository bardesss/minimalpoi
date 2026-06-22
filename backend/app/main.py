from contextlib import asynccontextmanager

from fastapi import FastAPI

from . import db
from .routers import auth, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    yield


app = FastAPI(title="MinimalPOI", lifespan=lifespan)
app.include_router(auth.router)
app.include_router(users.router)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
