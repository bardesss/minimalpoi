import os
import time

import httpx
from fastapi import APIRouter

from ..deps import CurrentUser

router = APIRouter(prefix="/api/version", tags=["version"])

GITHUB_LATEST_URL = "https://api.github.com/repos/Bardesss/minimalpoi/releases/latest"
_CACHE_TTL = 3600.0
_cache: dict = {"latest": None, "at": 0.0}


def _parse_semver(v: str) -> tuple[int, int, int] | None:
    parts = v.lstrip("v").split(".")
    try:
        return (int(parts[0]), int(parts[1]), int(parts[2]))
    except (IndexError, ValueError):
        return None


async def _fetch_latest(client: httpx.AsyncClient | None = None) -> str | None:
    owns = client is None
    if client is None:
        client = httpx.AsyncClient(timeout=5.0)
    try:
        resp = await client.get(GITHUB_LATEST_URL, headers={"Accept": "application/vnd.github+json"})
        resp.raise_for_status()
        tag = resp.json().get("tag_name")
        return tag.lstrip("v") if isinstance(tag, str) else None
    except (httpx.HTTPError, ValueError, KeyError, AttributeError, TypeError):
        return None
    finally:
        if owns:
            await client.aclose()


async def _cached_latest() -> str | None:
    now = time.monotonic()
    if _cache["at"] != 0.0 and now - _cache["at"] <= _CACHE_TTL:
        return _cache["latest"]
    fetched = await _fetch_latest()
    if fetched is not None:
        _cache["latest"] = fetched
    _cache["at"] = now  # stamp even on failure → don't re-hit GitHub until the TTL elapses
    return _cache["latest"]


@router.get("")
async def get_version(_: CurrentUser) -> dict:
    current = os.environ.get("MINIMALPOI_VERSION", "dev")
    latest = await _cached_latest()
    cur, lat = _parse_semver(current), (_parse_semver(latest) if latest else None)
    update_available = bool(cur and lat and lat > cur)
    return {"current": current, "latest": latest, "update_available": update_available}
