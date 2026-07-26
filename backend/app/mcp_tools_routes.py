"""MCP tools for reading and managing routes.

Each public tool is a thin wrapper that reads the caller's bearer token from
its Context and delegates to a private `_name(auth, ...)` coroutine, which
calls the app's own /api endpoints in-process. The private coroutines are
exercised directly in tests with an explicit auth string, without
constructing an MCP Context.
"""
from mcp.server.fastmcp import Context

from .mcp_server import _bearer, _client, _raise_for_tool, mcp


async def _list_routes(auth: str) -> list[dict]:
    async with _client(auth) as c:
        r = await c.get("/api/routes")
        _raise_for_tool(r)
        return r.json()


async def _get_route(auth: str, route_id: int) -> dict:
    async with _client(auth) as c:
        r = await c.get(f"/api/routes/{route_id}")
        _raise_for_tool(r)
        return r.json()


async def _create_route(auth: str, fields: dict) -> dict:
    async with _client(auth) as c:
        r = await c.post("/api/routes", json=fields)
        _raise_for_tool(r)
        return r.json()


async def _add_node(auth: str, route_id: int, fields: dict) -> dict:
    async with _client(auth) as c:
        r = await c.post(f"/api/routes/{route_id}/nodes", json=fields)
        _raise_for_tool(r)
        return r.json()


async def _add_route_stop(auth: str, route_id: int, fields: dict) -> dict:
    return await _add_node(auth, route_id, {**fields, "kind": "stop"})


async def _add_route_stay(auth: str, route_id: int, fields: dict) -> dict:
    return await _add_node(auth, route_id, {**fields, "kind": "stay"})


@mcp.tool()
async def list_routes(ctx: Context) -> list[dict]:
    """List all routes (trips) with dates and stop counts."""
    return await _list_routes(_bearer(ctx))


@mcp.tool()
async def get_route(route_id: int, ctx: Context) -> dict:
    """Get one route's full day-by-day detail: nodes (stops/stays), legs, and totals."""
    return await _get_route(_bearer(ctx), route_id)


@mcp.tool()
async def create_route(name: str, start_date: str, ctx: Context,
                       end_date: str | None = None, round_trip: bool = False,
                       team_id: int | None = None) -> dict:
    """Create a route. Dates are ISO (YYYY-MM-DD). Requires the Route module to be enabled."""
    fields = {"name": name, "start_date": start_date, "round_trip": round_trip}
    if end_date:
        fields["end_date"] = end_date
    if team_id is not None:
        fields["team_id"] = team_id
    return await _create_route(_bearer(ctx), fields)


@mcp.tool()
async def add_route_stop(route_id: int, ctx: Context, name: str | None = None,
                         lat: float | None = None, lng: float | None = None,
                         poi_id: int | None = None, day_offset: int | None = None,
                         notes: str | None = None) -> dict:
    """Add a stop to a route — either an existing place (poi_id) or an ad-hoc point (name+lat+lng)."""
    fields = {k: v for k, v in {"name": name, "lat": lat, "lng": lng, "poi_id": poi_id,
                                "day_offset": day_offset, "notes": notes}.items() if v is not None}
    return await _add_route_stop(_bearer(ctx), route_id, fields)


@mcp.tool()
async def add_route_stay(route_id: int, nights: int, ctx: Context, name: str | None = None,
                         lat: float | None = None, lng: float | None = None,
                         poi_id: int | None = None, notes: str | None = None) -> dict:
    """Add a multi-night stay to a route — an existing place (poi_id) or an ad-hoc point (name+lat+lng)."""
    fields = {"nights": nights}
    fields.update({k: v for k, v in {"name": name, "lat": lat, "lng": lng, "poi_id": poi_id,
                                     "notes": notes}.items() if v is not None})
    return await _add_route_stay(_bearer(ctx), route_id, fields)


async def _update_route(auth: str, route_id: int, fields: dict) -> dict:
    async with _client(auth) as c:
        r = await c.patch(f"/api/routes/{route_id}", json=fields)
        _raise_for_tool(r)
        return r.json()


async def _delete_route(auth: str, route_id: int) -> dict:
    async with _client(auth) as c:
        r = await c.delete(f"/api/routes/{route_id}")
        _raise_for_tool(r)
        return {"deleted": route_id}


async def _update_route_node(auth: str, route_id: int, node_id: int, fields: dict) -> dict:
    async with _client(auth) as c:
        r = await c.patch(f"/api/routes/{route_id}/nodes/{node_id}", json=fields)
        _raise_for_tool(r)
        return r.json()


async def _delete_route_node(auth: str, route_id: int, node_id: int) -> dict:
    async with _client(auth) as c:
        r = await c.delete(f"/api/routes/{route_id}/nodes/{node_id}")
        _raise_for_tool(r)
        return r.json()


@mcp.tool()
async def update_route(route_id: int, ctx: Context, name: str | None = None,
                       start_date: str | None = None, end_date: str | None = None,
                       round_trip: bool | None = None, team_id: int | None = None) -> dict:
    """Update a route's name, dates (ISO YYYY-MM-DD), round-trip flag, or team. Editor-only."""
    fields = {k: v for k, v in {
        "name": name, "start_date": start_date, "end_date": end_date,
        "round_trip": round_trip, "team_id": team_id,
    }.items() if v is not None}
    return await _update_route(_bearer(ctx), route_id, fields)


@mcp.tool()
async def delete_route(route_id: int, ctx: Context) -> dict:
    """Delete a route (editor-only). Immediate and permanent."""
    return await _delete_route(_bearer(ctx), route_id)


@mcp.tool()
async def update_route_node(route_id: int, node_id: int, ctx: Context,
                            position: float | None = None, nights: int | None = None,
                            day_offset: int | None = None, notes: str | None = None,
                            poi_id: int | None = None, name: str | None = None,
                            lat: float | None = None, lng: float | None = None) -> dict:
    """Edit a route stop/stay: reorder via `position` (fractional key), or change nights,
    day, notes, or the linked place/point. Editor-only. Returns the updated route."""
    fields = {k: v for k, v in {
        "position": position, "nights": nights, "day_offset": day_offset, "notes": notes,
        "poi_id": poi_id, "name": name, "lat": lat, "lng": lng,
    }.items() if v is not None}
    return await _update_route_node(_bearer(ctx), route_id, node_id, fields)


@mcp.tool()
async def delete_route_node(route_id: int, node_id: int, ctx: Context) -> dict:
    """Remove a stop/stay from a route (editor-only). Returns the updated route."""
    return await _delete_route_node(_bearer(ctx), route_id, node_id)
