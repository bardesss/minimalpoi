import httpx

from .fetch import USER_AGENT
from .safety import UnsafeURLError, safe_get


async def nominatim_geocode(
    query: str, base_url: str, client: httpx.AsyncClient | None = None
) -> tuple[float, float] | None:
    if not query.strip():
        return None
    owns = client is None
    if client is None:
        client = httpx.AsyncClient(timeout=10.0, headers={"User-Agent": USER_AGENT})
    base = base_url.rstrip("/") + "/search"
    url = str(httpx.URL(base, params={"q": query, "format": "json", "limit": 1}))
    try:
        # Route through the SSRF guard too — the nominatim URL is admin-set but
        # still attacker-influenceable if an admin account is compromised.
        resp = await safe_get(client, url)
        data = resp.json()
    except (httpx.HTTPError, UnsafeURLError, ValueError):
        return None
    finally:
        if owns:
            await client.aclose()
    if not data:
        return None
    try:
        return (float(data[0]["lat"]), float(data[0]["lon"]))
    except (KeyError, IndexError, TypeError, ValueError):
        return None


_OSM_TYPES = {"node": "N", "way": "W", "relation": "R"}


def _client(client: httpx.AsyncClient | None) -> tuple[httpx.AsyncClient, bool]:
    if client is not None:
        return client, False
    return httpx.AsyncClient(timeout=10.0, headers={"User-Agent": USER_AGENT}), True


def _city(address: dict) -> str | None:
    for key in ("city", "town", "village", "municipality", "hamlet"):
        if address.get(key):
            return address[key]
    return None


async def nominatim_search(query: str, base_url: str, client: httpx.AsyncClient | None = None, limit: int = 8) -> list[dict]:
    """Free-text place search on a Nominatim server (the no-Google fallback).
    Results use `osm:<N|W|R><id>` place ids so the draft endpoint can look them up."""
    if not query.strip():
        return []
    client, owns = _client(client)
    url = str(httpx.URL(base_url.rstrip("/") + "/search",
                        params={"q": query, "format": "jsonv2", "addressdetails": 1, "limit": limit}))
    try:
        resp = await safe_get(client, url)
        data = resp.json() if resp.status_code == 200 else []
    except (httpx.HTTPError, UnsafeURLError, ValueError):
        return []
    finally:
        if owns:
            await client.aclose()
    out: list[dict] = []
    for item in data if isinstance(data, list) else []:
        try:
            prefix = _OSM_TYPES[item["osm_type"]]
            display = item.get("display_name") or ""
            out.append({
                "place_id": f"osm:{prefix}{int(item['osm_id'])}",
                "name": item.get("name") or display.split(",")[0].strip(),
                "address": display or None,
                "lat": float(item["lat"]),
                "lng": float(item["lon"]),
                "source": "osm",
            })
        except (KeyError, TypeError, ValueError):
            continue
    return out


async def nominatim_lookup(osm_id: str, base_url: str, client: httpx.AsyncClient | None = None) -> "POIDraft | None":
    """Resolve an `N123`/`W45`/`R6` OSM id into a POI draft (name, address, city, country, coords)."""
    from ..schemas import POIDraft  # local import: schemas imports nothing from enrich, but keep geocode import-light

    client, owns = _client(client)
    url = str(httpx.URL(base_url.rstrip("/") + "/lookup",
                        params={"osm_ids": osm_id, "format": "jsonv2", "addressdetails": 1}))
    try:
        resp = await safe_get(client, url)
        data = resp.json() if resp.status_code == 200 else []
    except (httpx.HTTPError, UnsafeURLError, ValueError):
        return None
    finally:
        if owns:
            await client.aclose()
    if not isinstance(data, list) or not data:
        return None
    item = data[0]
    try:
        lat, lng = float(item["lat"]), float(item["lon"])
    except (KeyError, TypeError, ValueError):
        return None
    address = item.get("address") or {}
    display = item.get("display_name") or None
    draft = POIDraft(
        name=item.get("name") or (display.split(",")[0].strip() if display else None),
        address=display,
        city=_city(address),
        country_code=(address.get("country_code") or "").upper() or None,
        lat=lat,
        lng=lng,
    )
    draft.field_sources = {k: "osm" for k in ("name", "address", "city", "country_code", "lat", "lng") if getattr(draft, k) is not None}
    return draft
