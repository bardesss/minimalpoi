import httpx

from .fetch import USER_AGENT


async def nominatim_geocode(
    query: str, base_url: str, client: httpx.AsyncClient | None = None
) -> tuple[float, float] | None:
    if not query.strip():
        return None
    owns = client is None
    if client is None:
        client = httpx.AsyncClient(timeout=10.0, headers={"User-Agent": USER_AGENT})
    url = base_url.rstrip("/") + "/search"
    try:
        resp = await client.get(url, params={"q": query, "format": "json", "limit": 1})
        data = resp.json()
    except (httpx.HTTPError, ValueError):
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
