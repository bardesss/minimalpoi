import re
from urllib.parse import unquote, urlparse

import httpx

_AT = re.compile(r"@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)")
_3D4D = re.compile(r"!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)")
_PLACE = re.compile(r"/maps/place/([^/@?]+)")

PLACES_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"


def is_shortlink(url: str) -> bool:
    p = urlparse(url)
    host = (p.hostname or "").lower()
    return host == "maps.app.goo.gl" or (host == "goo.gl" and p.path.startswith("/maps"))


def is_google_maps(url: str) -> bool:
    if is_shortlink(url):
        return True
    p = urlparse(url)
    host = (p.hostname or "").lower()
    return host in {"www.google.com", "google.com", "maps.google.com"} and p.path.startswith("/maps")


def extract_coords(url: str) -> tuple[float, float] | None:
    m = _3D4D.search(url) or _AT.search(url)
    if not m:
        return None
    return (float(m.group(1)), float(m.group(2)))


def extract_place_name(url: str) -> str | None:
    m = _PLACE.search(url)
    if not m:
        return None
    return unquote(m.group(1).replace("+", " ")).strip() or None


async def resolve_shortlink(url: str, client: httpx.AsyncClient | None = None) -> str:
    owns = client is None
    if client is None:
        client = httpx.AsyncClient(follow_redirects=True, timeout=10.0)
    try:
        resp = await client.get(url)
        return str(resp.url)
    except httpx.HTTPError:
        return url
    finally:
        if owns:
            await client.aclose()


async def places_lookup(query: str, api_key: str, client: httpx.AsyncClient | None = None) -> dict | None:
    owns = client is None
    if client is None:
        client = httpx.AsyncClient(timeout=10.0)
    try:
        resp = await client.get(PLACES_URL, params={"query": query, "key": api_key})
        data = resp.json()
    except (httpx.HTTPError, ValueError):
        return None
    finally:
        if owns:
            await client.aclose()
    results = data.get("results") or []
    if not results:
        return None
    first = results[0]
    out: dict = {}
    if isinstance(first.get("name"), str):
        out["name"] = first["name"]
    if isinstance(first.get("formatted_address"), str):
        out["address"] = first["formatted_address"]
    loc = (first.get("geometry") or {}).get("location") or {}
    if "lat" in loc and "lng" in loc:
        out["lat"] = float(loc["lat"])
        out["lng"] = float(loc["lng"])
    return out or None
