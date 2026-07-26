"""MCP tools for reading POIs, categories, and tags.

Each public tool is a thin wrapper that reads the caller's bearer token from
its Context and delegates to a private `_name(auth, ...)` coroutine, which
calls the app's own /api endpoints in-process. The private coroutines are
exercised directly in tests with an explicit auth string, without
constructing an MCP Context.
"""
from mcp.server.fastmcp import Context

from .mcp_server import _bearer, _client, _raise_for_tool, mcp


async def _list_pois(auth: str) -> list[dict]:
    async with _client(auth) as c:
        r = await c.get("/api/pois")
        _raise_for_tool(r)
        return r.json()


async def _get_poi(auth: str, poi_id: int) -> dict:
    async with _client(auth) as c:
        r = await c.get(f"/api/pois/{poi_id}")
        _raise_for_tool(r)
        return r.json()


async def _list_categories(auth: str) -> list[dict]:
    async with _client(auth) as c:
        r = await c.get("/api/categories")
        _raise_for_tool(r)
        return r.json()


async def _list_tags(auth: str) -> list[dict]:
    async with _client(auth) as c:
        r = await c.get("/api/tags")
        _raise_for_tool(r)
        return r.json()


@mcp.tool()
async def list_pois(ctx: Context) -> list[dict]:
    """List all places (POIs) with their coordinates, category, tags, and ratings."""
    return await _list_pois(_bearer(ctx))


@mcp.tool()
async def get_poi(poi_id: int, ctx: Context) -> dict:
    """Get one place by its id."""
    return await _get_poi(_bearer(ctx), poi_id)


@mcp.tool()
async def list_categories(ctx: Context) -> list[dict]:
    """List categories (id, name, color, icon) — use these ids when creating a place."""
    return await _list_categories(_bearer(ctx))


@mcp.tool()
async def list_tags(ctx: Context) -> list[dict]:
    """List tags with their usage counts."""
    return await _list_tags(_bearer(ctx))


async def _create_poi(auth: str, fields: dict) -> dict:
    async with _client(auth) as c:
        r = await c.post("/api/pois", json=fields)
        _raise_for_tool(r)
        return r.json()


async def _check_duplicate(auth: str, fields: dict) -> dict:
    async with _client(auth) as c:
        r = await c.post("/api/pois/check-duplicate", json=fields)
        _raise_for_tool(r)
        return r.json()


async def _enrich_from_url(auth: str, url: str) -> dict:
    async with _client(auth) as c:
        r = await c.post("/api/enrich", json={"url": url})
        _raise_for_tool(r)
        return r.json()


async def _search_places(auth: str, query: str) -> list[dict]:
    async with _client(auth) as c:
        r = await c.get("/api/places/search", params={"q": query})
        _raise_for_tool(r)
        return r.json()


async def _get_place_draft(auth: str, place_id: str) -> dict:
    async with _client(auth) as c:
        r = await c.get(f"/api/places/{place_id}")
        _raise_for_tool(r)
        return r.json()


@mcp.tool()
async def create_poi(
    name: str,
    lat: float,
    lng: float,
    ctx: Context,
    address: str | None = None,
    city: str | None = None,
    country_code: str | None = None,
    category_id: int | None = None,
    tags: list[str] | None = None,
    notes: str | None = None,
    phone: str | None = None,
    email: str | None = None,
    website: str | None = None,
    image_url: str | None = None,
    source_url: str | None = None,
) -> dict:
    """Create a place. Requires name and coordinates; category_id comes from list_categories."""
    fields = {"name": name, "lat": lat, "lng": lng, "address": address, "city": city,
              "country_code": country_code, "category_id": category_id, "tags": tags or [],
              "notes": notes, "phone": phone, "email": email, "website": website,
              "image_url": image_url, "source_url": source_url}
    return await _create_poi(_bearer(ctx), {k: v for k, v in fields.items() if v is not None})


@mcp.tool()
async def check_duplicate(name: str, lat: float, lng: float, ctx: Context,
                          source_url: str | None = None) -> dict:
    """Check whether a place with this name/location already exists before creating it."""
    body = {"name": name, "lat": lat, "lng": lng}
    if source_url:
        body["source_url"] = source_url
    return await _check_duplicate(_bearer(ctx), body)


@mcp.tool()
async def enrich_from_url(url: str, ctx: Context) -> dict:
    """Turn a Google Maps or website link into a draft place (name, coords, address, image).
    Works without a Google key via page metadata."""
    return await _enrich_from_url(_bearer(ctx), url)


@mcp.tool()
async def search_places(query: str, ctx: Context) -> list[dict]:
    """Search Google Places by name. Requires a configured Google API key."""
    return await _search_places(_bearer(ctx), query)


@mcp.tool()
async def get_place_draft(place_id: str, ctx: Context) -> dict:
    """Fetch full Google Places details for a place_id (from search_places) as a draft.
    Requires a configured Google API key."""
    return await _get_place_draft(_bearer(ctx), place_id)


async def _update_poi(auth: str, poi_id: int, fields: dict) -> dict:
    async with _client(auth) as c:
        r = await c.patch(f"/api/pois/{poi_id}", json=fields)
        _raise_for_tool(r)
        return r.json()


async def _delete_poi(auth: str, poi_id: int) -> dict:
    async with _client(auth) as c:
        r = await c.delete(f"/api/pois/{poi_id}")
        _raise_for_tool(r)
        return {"deleted": poi_id}


@mcp.tool()
async def update_poi(
    poi_id: int,
    ctx: Context,
    name: str | None = None,
    address: str | None = None,
    city: str | None = None,
    country_code: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    category_id: int | None = None,
    tags: list[str] | None = None,
    notes: str | None = None,
    phone: str | None = None,
    email: str | None = None,
    website: str | None = None,
    image_url: str | None = None,
    source_url: str | None = None,
) -> dict:
    """Update fields of a place you created (admins: any place). Only the fields you pass change."""
    fields = {k: v for k, v in {
        "name": name, "address": address, "city": city, "country_code": country_code,
        "lat": lat, "lng": lng, "category_id": category_id, "tags": tags, "notes": notes,
        "phone": phone, "email": email, "website": website, "image_url": image_url,
        "source_url": source_url,
    }.items() if v is not None}
    return await _update_poi(_bearer(ctx), poi_id, fields)


@mcp.tool()
async def delete_poi(poi_id: int, ctx: Context) -> dict:
    """Delete a place you created (admins: any place). This is immediate and permanent."""
    return await _delete_poi(_bearer(ctx), poi_id)


async def _set_visit(auth: str, poi_id: int, fields: dict) -> dict:
    async with _client(auth) as c:
        r = await c.put(f"/api/pois/{poi_id}/visit", json=fields)
        _raise_for_tool(r)
        return r.json()


async def _delete_visit(auth: str, poi_id: int) -> dict:
    async with _client(auth) as c:
        r = await c.delete(f"/api/pois/{poi_id}/visit")
        _raise_for_tool(r)
        return {"deleted_visit": poi_id}


async def _add_comment(auth: str, poi_id: int, text: str) -> dict:
    async with _client(auth) as c:
        r = await c.post(f"/api/pois/{poi_id}/comments", json={"text": text})
        _raise_for_tool(r)
        return r.json()


async def _update_comment(auth: str, poi_id: int, comment_id: int, text: str) -> dict:
    async with _client(auth) as c:
        r = await c.patch(f"/api/pois/{poi_id}/comments/{comment_id}", json={"text": text})
        _raise_for_tool(r)
        return r.json()


async def _delete_comment(auth: str, poi_id: int, comment_id: int) -> dict:
    async with _client(auth) as c:
        r = await c.delete(f"/api/pois/{poi_id}/comments/{comment_id}")
        _raise_for_tool(r)
        return {"deleted_comment": comment_id}


@mcp.tool()
async def set_visit(poi_id: int, ctx: Context, rating: int | None = None,
                    team_id: int | None = None) -> dict:
    """Mark a place visited by you and optionally set a 1-5 star rating (upsert)."""
    fields = {k: v for k, v in {"rating": rating, "team_id": team_id}.items() if v is not None}
    return await _set_visit(_bearer(ctx), poi_id, fields)


@mcp.tool()
async def delete_visit(poi_id: int, ctx: Context) -> dict:
    """Remove your visit (and rating) for a place."""
    return await _delete_visit(_bearer(ctx), poi_id)


@mcp.tool()
async def add_comment(poi_id: int, text: str, ctx: Context) -> dict:
    """Add a comment to a place, attributed to you."""
    return await _add_comment(_bearer(ctx), poi_id, text)


@mcp.tool()
async def update_comment(poi_id: int, comment_id: int, text: str, ctx: Context) -> dict:
    """Edit one of your comments (admins: any)."""
    return await _update_comment(_bearer(ctx), poi_id, comment_id, text)


@mcp.tool()
async def delete_comment(poi_id: int, comment_id: int, ctx: Context) -> dict:
    """Delete one of your comments (admins: any)."""
    return await _delete_comment(_bearer(ctx), poi_id, comment_id)
