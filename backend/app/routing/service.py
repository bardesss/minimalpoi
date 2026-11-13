import asyncio
from collections import defaultdict
from datetime import date, timedelta

import httpx
from sqlmodel import Session, select

from ..enrich.service import _google_key
from ..models import (
    LegSource,
    NodeRole,
    Route,
    RouteLeg,
    RouteNode,
    RouteNodeKind,
    Settings,
    get_or_create_settings,
)
from .calc import HaversineCalc, Leg
from .google import GoogleCalc


def resolve_calc(settings: Settings) -> tuple[GoogleCalc | None, HaversineCalc]:
    key = _google_key(settings)
    google = GoogleCalc(key) if key else None
    return google, HaversineCalc()


def _role_rank(role) -> int:
    if role == NodeRole.START:
        return 0
    if role == NodeRole.END:
        return 2
    return 1


def ordered_nodes(session: Session, route_id: int) -> list[RouteNode]:
    """Public helper — the ONLY definition; imported by routers/routes.py too.
    Start pins first, end pins last; middle nodes keep fractional-position order."""
    rows = session.exec(select(RouteNode).where(RouteNode.route_id == route_id)).all()
    return sorted(rows, key=lambda n: (_role_rank(n.role), n.position))


def legs_for(session: Session, route_id: int) -> list[RouteLeg]:
    """Public helper — the ONLY definition; imported by routers/routes.py too."""
    return list(session.exec(select(RouteLeg).where(RouteLeg.route_id == route_id)).all())


# One lock per route, so overlapping recomputes (two edits landing while a slow
# Google call is in flight) run one after another instead of interleaving their
# delete-then-insert. Process-local: it serialises within one worker only.
_route_locks: defaultdict[int, asyncio.Lock] = defaultdict(asyncio.Lock)


async def recompute_legs(session: Session, route_id: int) -> None:
    """Replace the route's cached legs. Google per leg when available; haversine
    fallback on any miss. Runs after any node add/edit/delete/reorder.

    The whole read-compute-replace runs under the route's lock, and the old legs
    are deleted and the new ones inserted only after every await, in a single
    commit, so no write transaction stays open across a network call."""
    async with _route_locks[route_id]:
        nodes = ordered_nodes(session, route_id)
        pairs = list(zip(nodes, nodes[1:]))
        computed = await _compute_legs(session, pairs) if pairs else []
        # Per-row delete to match house style (the codebase never bulk-deletes
        # via sqlmodel.delete).
        for old in session.exec(select(RouteLeg).where(RouteLeg.route_id == route_id)).all():
            session.delete(old)
        for (a, b), leg in zip(pairs, computed):
            session.add(RouteLeg(
                route_id=route_id, from_node_id=a.id, to_node_id=b.id,
                distance_m=leg.distance_m, duration_s=leg.duration_s,
                source=LegSource(leg.source), geometry=leg.geometry,
            ))
        session.commit()


async def _compute_legs(session: Session, pairs: list[tuple[RouteNode, RouteNode]]) -> list[Leg]:
    settings = get_or_create_settings(session)
    google, haversine = resolve_calc(settings)
    client = httpx.AsyncClient(timeout=10.0) if google else None

    async def _compute(a: RouteNode, b: RouteNode) -> Leg:
        leg = None
        if google:
            leg = await google.leg(a.lat, a.lng, b.lat, b.lng)
        if leg is None:
            leg = haversine.leg(a.lat, a.lng, b.lat, b.lng)
        return leg

    try:
        if google:
            google.client = client
        # Issue every leg concurrently; gather preserves input order so the
        # caller's zip still pairs each Leg with the right nodes.
        return list(await asyncio.gather(*(_compute(a, b) for a, b in pairs)))
    finally:
        if client:
            await client.aclose()


def derive(nodes: list[RouteNode], legs: list[RouteLeg], start_date: date) -> dict:
    """Pure: end date, route totals, and per-stay arrive/depart dates + inbound
    travel (sum of legs since the previous stay)."""
    leg_by_pair = {(l.from_node_id, l.to_node_id): l for l in legs}
    total_d = sum(l.distance_m for l in legs)
    total_s = sum(l.duration_s for l in legs)

    stays: dict[int, dict] = {}
    cursor = start_date
    inbound_d = inbound_s = 0
    prev = None
    for node in nodes:
        if prev is not None:
            leg = leg_by_pair.get((prev.id, node.id))
            if leg:
                inbound_d += leg.distance_m
                inbound_s += leg.duration_s
        if node.kind == RouteNodeKind.STAY:
            nights = node.nights or 0
            stays[node.id] = {
                "arrive_date": cursor,
                "depart_date": cursor + timedelta(days=nights),
                "inbound_distance_m": inbound_d,
                "inbound_duration_s": inbound_s,
            }
            cursor = cursor + timedelta(days=nights)
            inbound_d = inbound_s = 0  # reset for the next segment
        prev = node

    return {
        "end_date": cursor,
        "totals": {"distance_m": total_d, "duration_s": total_s},
        "stays": stays,
    }
