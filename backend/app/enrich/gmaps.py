import re
from urllib.parse import unquote, urlparse

import httpx

from .safety import UnsafeURLError, safe_get

_AT = re.compile(r"@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)")
_3D4D = re.compile(r"!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)")
_PLACE = re.compile(r"/maps/place/([^/@?]+)")

PLACES_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"
PHOTO_URL = "https://maps.googleapis.com/maps/api/place/photo"


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
        client = httpx.AsyncClient(follow_redirects=False, timeout=10.0)
    try:
        resp = await safe_get(client, url)
        return str(resp.url)
    except (httpx.HTTPError, UnsafeURLError):
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
    if isinstance(first.get("place_id"), str):
        out["place_id"] = first["place_id"]
    loc = (first.get("geometry") or {}).get("location") or {}
    if "lat" in loc and "lng" in loc:
        out["lat"] = float(loc["lat"])
        out["lng"] = float(loc["lng"])
    return out or None


async def place_details(place_id: str, api_key: str, client: httpx.AsyncClient | None = None) -> dict | None:
    """Fetch phone / website / a photo reference for a place_id (Place Details).

    Returns `{phone?, website?, photo_reference?}`; phone prefers the
    international (E.164-ish) form so it normalizes cleanly. None on any error.
    """
    owns = client is None
    if client is None:
        client = httpx.AsyncClient(timeout=10.0)
    try:
        resp = await client.get(DETAILS_URL, params={
            "place_id": place_id,
            "fields": "international_phone_number,formatted_phone_number,website,photos",
            "key": api_key,
        })
        data = resp.json()
    except (httpx.HTTPError, ValueError):
        return None
    finally:
        if owns:
            await client.aclose()
    result = data.get("result") or {}
    out: dict = {}
    phone = result.get("international_phone_number") or result.get("formatted_phone_number")
    if isinstance(phone, str):
        out["phone"] = phone
    if isinstance(result.get("website"), str):
        out["website"] = result["website"]
    photos = result.get("photos") or []
    if photos and isinstance(photos[0].get("photo_reference"), str):
        out["photo_reference"] = photos[0]["photo_reference"]
    return out or None


async def resolve_photo_url(
    photo_reference: str, api_key: str, client: httpx.AsyncClient | None = None, maxwidth: int = 1000
) -> str | None:
    """Resolve a Places photo reference to its public image URL.

    The Photos endpoint 302-redirects to a googleusercontent URL that carries no
    API key. We read that `Location` (without following it) so the key never
    reaches the browser; the draft image_url is downloaded/localized on save.
    """
    owns = client is None
    if client is None:
        client = httpx.AsyncClient(follow_redirects=False, timeout=10.0)
    try:
        resp = await client.get(PHOTO_URL, params={
            "photo_reference": photo_reference,
            "maxwidth": maxwidth,
            "key": api_key,
        }, follow_redirects=False)
        location = resp.headers.get("location")
    except httpx.HTTPError:
        return None
    finally:
        if owns:
            await client.aclose()
    return location or None
