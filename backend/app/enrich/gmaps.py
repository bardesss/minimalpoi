import re
from urllib.parse import parse_qs, unquote, urlparse

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


def unwrap_consent(url: str) -> str:
    """Recover the real Maps URL from a Google consent gate.

    In the EU, short links resolve to `consent.google.com/ml?continue=<encoded>`,
    where the actual maps URL is URL-encoded in the `continue` param. Without
    unwrapping, coords/name extraction reads a doubly-encoded URL (e.g. spaces
    arrive as `%2B`). Returns the unwrapped URL, or the input unchanged.
    """
    p = urlparse(url)
    if (p.hostname or "").lower() != "consent.google.com":
        return url
    cont = parse_qs(p.query).get("continue")
    if cont and cont[0]:
        return unquote(cont[0])
    return url


def extract_coords(url: str) -> tuple[float, float] | None:
    m = _3D4D.search(url) or _AT.search(url)
    if not m:
        return None
    return (float(m.group(1)), float(m.group(2)))


def extract_place_name(url: str) -> str | None:
    m = _PLACE.search(url)
    if not m:
        return None
    # Unquote first, then turn the Maps space-encoding (`+`) into spaces. Doing
    # it the other way leaves `%2B`-encoded names (from a consent redirect)
    # decoding to a literal "+" — e.g. "TACO+LINDO+West".
    return unquote(m.group(1)).replace("+", " ").strip() or None


async def resolve_shortlink(url: str, client: httpx.AsyncClient | None = None) -> str:
    owns = client is None
    if client is None:
        client = httpx.AsyncClient(follow_redirects=False, timeout=10.0)
    try:
        resp = await safe_get(client, url)
        return unwrap_consent(str(resp.url))
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


async def place_search(query: str, api_key: str, client: httpx.AsyncClient | None = None, limit: int = 6) -> list[dict]:
    """Text Search → a list of candidate places to pick from.

    Each candidate is `{place_id, name, address}` (plus `lat`/`lng` when the
    response carries geometry). Returns an empty list on any error.
    """
    owns = client is None
    if client is None:
        client = httpx.AsyncClient(timeout=10.0)
    try:
        resp = await client.get(PLACES_URL, params={"query": query, "key": api_key})
        data = resp.json()
    except (httpx.HTTPError, ValueError):
        return []
    finally:
        if owns:
            await client.aclose()
    out: list[dict] = []
    for first in (data.get("results") or [])[:limit]:
        if not isinstance(first.get("place_id"), str) or not isinstance(first.get("name"), str):
            continue
        cand: dict = {"place_id": first["place_id"], "name": first["name"]}
        if isinstance(first.get("formatted_address"), str):
            cand["address"] = first["formatted_address"]
        loc = (first.get("geometry") or {}).get("location") or {}
        if "lat" in loc and "lng" in loc:
            cand["lat"] = float(loc["lat"])
            cand["lng"] = float(loc["lng"])
        out.append(cand)
    return out


async def place_by_id(place_id: str, api_key: str, client: httpx.AsyncClient | None = None) -> dict | None:
    """Full Place Details for a chosen search result.

    Returns everything needed to fill the add-place form:
    `{name?, address?, lat?, lng?, phone?, website?, photo_reference?, city?,
    country_code?}`. None on any error.
    """
    owns = client is None
    if client is None:
        client = httpx.AsyncClient(timeout=10.0)
    try:
        resp = await client.get(DETAILS_URL, params={
            "place_id": place_id,
            "fields": (
                "name,formatted_address,geometry,international_phone_number,"
                "formatted_phone_number,website,photos,address_component"
            ),
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
    if isinstance(result.get("name"), str):
        out["name"] = result["name"]
    if isinstance(result.get("formatted_address"), str):
        out["address"] = result["formatted_address"]
    loc = (result.get("geometry") or {}).get("location") or {}
    if "lat" in loc and "lng" in loc:
        out["lat"] = float(loc["lat"])
        out["lng"] = float(loc["lng"])
    phone = result.get("international_phone_number") or result.get("formatted_phone_number")
    if isinstance(phone, str):
        out["phone"] = phone
    if isinstance(result.get("website"), str):
        out["website"] = result["website"]
    photos = result.get("photos") or []
    if photos and isinstance(photos[0].get("photo_reference"), str):
        out["photo_reference"] = photos[0]["photo_reference"]
    city, country = _city_country(result.get("address_components") or [])
    if city:
        out["city"] = city
    if country:
        out["country_code"] = country
    return out or None


async def place_details(place_id: str, api_key: str, client: httpx.AsyncClient | None = None) -> dict | None:
    """Fetch phone / website / photo / city / country for a place_id.

    Returns `{phone?, website?, photo_reference?, city?, country_code?}`; phone
    prefers the international (E.164-ish) form so it normalizes cleanly. City and
    country come from structured `address_components` (country is the ISO
    3166-1 alpha-2 code). None on any error.
    """
    owns = client is None
    if client is None:
        client = httpx.AsyncClient(timeout=10.0)
    try:
        resp = await client.get(DETAILS_URL, params={
            "place_id": place_id,
            "fields": "international_phone_number,formatted_phone_number,website,photos,address_component",
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
    city, country = _city_country(result.get("address_components") or [])
    if city:
        out["city"] = city
    if country:
        out["country_code"] = country
    return out or None


def _city_country(components: list) -> tuple[str | None, str | None]:
    """Pull a display city + ISO country code from Google address_components.

    City prefers `locality`, then `postal_town` (UK) / admin-area fallbacks so
    places without a locality (villages, regions) still get a sensible label.
    """
    def pick(*types: str) -> dict | None:
        for t in types:
            for c in components:
                if t in (c.get("types") or []):
                    return c
        return None

    city_c = pick("locality", "postal_town", "administrative_area_level_2", "administrative_area_level_1")
    country_c = pick("country")
    city = city_c.get("long_name") if city_c and isinstance(city_c.get("long_name"), str) else None
    country = country_c.get("short_name") if country_c and isinstance(country_c.get("short_name"), str) else None
    return city, country


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
