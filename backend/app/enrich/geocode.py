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
