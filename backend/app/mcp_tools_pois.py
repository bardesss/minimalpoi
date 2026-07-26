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
