from contextlib import asynccontextmanager

from fastapi import FastAPI

from . import db


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    yield


app = FastAPI(title="MinimalPOI", lifespan=lifespan)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
