from datetime import date, timedelta

import httpx
from sqlmodel import Session, select

from ..enrich.service import _google_key
from ..models import (
    LegSource,
    Route,
    RouteLeg,
    RouteNode,
    RouteNodeKind,
    Settings,
    get_or_create_settings,
)
from .calc import HaversineCalc
from .google import GoogleCalc


def resolve_calc(settings: Settings) -> tuple[GoogleCalc | None, HaversineCalc]:
    key = _google_key(settings)
    google = GoogleCalc(key) if key else None
    return google, HaversineCalc()


def ordered_nodes(session: Session, route_id: int) -> list[RouteNode]:
    """Public helper — the ONLY definition; imported by routers/routes.py too."""
    return list(session.exec(
        select(RouteNode).where(RouteNode.route_id == route_id).order_by(RouteNode.position)
    ).all())


def legs_for(session: Session, route_id: int) -> list[RouteLeg]:
    """Public helper — the ONLY definition; imported by routers/routes.py too."""
    return list(session.exec(select(RouteLeg).where(RouteLeg.route_id == route_id)).all())


async def recompute_legs(session: Session, route_id: int) -> None:
    """Replace the route's cached legs. Google per leg when available; haversine
    fallback on any miss. Runs after any node add/edit/delete/reorder."""
    nodes = ordered_nodes(session, route_id)
    # Per-row delete to match house style (the codebase never bulk-deletes via
    # sqlmodel.delete — see trip/engine.py).
    for old in session.exec(select(RouteLeg).where(RouteLeg.route_id == route_id)).all():
        session.delete(old)
    if len(nodes) < 2:
        session.commit()
        return
    settings = get_or_create_settings(session)
    google, haversine = resolve_calc(settings)
    client = httpx.AsyncClient(timeout=10.0) if google else None
    try:
        for a, b in zip(nodes, nodes[1:]):
            leg = None
            if google:
                google.client = client
                leg = await google.leg(a.lat, a.lng, b.lat, b.lng)
            if leg is None:
                leg = haversine.leg(a.lat, a.lng, b.lat, b.lng)
            session.add(RouteLeg(
                route_id=route_id, from_node_id=a.id, to_node_id=b.id,
                distance_m=leg.distance_m, duration_s=leg.duration_s,
                source=LegSource(leg.source), geometry=leg.geometry,
            ))
    finally:
        if client:
            await client.aclose()
    session.commit()


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
