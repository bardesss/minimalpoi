import asyncio
import json
import queue as _queue
import secrets
from datetime import date

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlmodel import select

from .. import attachments as att
from ..deps import CurrentUser, SessionDep
from ..models import (
    POI,
    NodeRole,
    Role,
    Route,
    RouteAttachment,
    RouteLeg,
    RouteNode,
    RouteNodeKind,
    RouteShare,
    Team,
    TeamMember,
    User,
    get_or_create_settings,
    utcnow,
)
from ..ratelimit import GOOGLE_LIMIT, UPLOAD_LIMIT, WRITE_LIMIT, limiter, user_or_ip
from ..routes_export import route_to_geojson, route_to_gpx, route_to_kml
from ..routing.events import RouteEventHub, route_hub
from ..routing.service import derive, legs_for, ordered_nodes, recompute_legs
from ..schemas import (
    RouteAttachmentRead,
    RouteCreate,
    RouteDetail,
    RouteLegRead,
    RouteNodeCreate,
    RouteNodeRead,
    RouteNodeUpdate,
    RouteSummary,
    RouteUpdate,
    ShareInfo,
    ShareSettingsUpdate,
)
from ..security import hash_password

router = APIRouter(prefix="/api/routes", tags=["routes"])


def require_routes_enabled(session: SessionDep) -> None:
    if not get_or_create_settings(session).routes_enabled:
        raise HTTPException(status_code=404, detail="Not found")


Gate = Depends(require_routes_enabled)


def _username(session, user_id: int) -> str:
    u = session.get(User, user_id)
    return u.username if u else "(deleted)"


def _summary(session, route: Route) -> RouteSummary:
    nodes = ordered_nodes(session, route.id)
    d = derive(nodes, legs_for(session, route.id), route.start_date)
    return RouteSummary(
        id=route.id, name=route.name, start_date=route.start_date,
        end_date=route.end_date, round_trip=route.round_trip, scheduled_end_date=d["end_date"],
        node_count=len(nodes), created_by=route.created_by,
        owner_username=_username(session, route.created_by),
        team_id=route.team_id, team_name=_team_name(session, route.team_id),
    )


def _detail(session, route: Route, user: User, request: Request | None = None) -> RouteDetail:
    nodes = ordered_nodes(session, route.id)
    legs = legs_for(session, route.id)
    d = derive(nodes, legs, route.start_date)
    node_reads = []
    for n in nodes:
        extra = d["stays"].get(n.id, {})
        node_reads.append(RouteNodeRead(
            id=n.id, kind=n.kind, role=n.role, position=n.position, nights=n.nights, notes=n.notes,
            poi_id=n.poi_id, name=n.name, lat=n.lat, lng=n.lng, day_offset=n.day_offset, **extra,
        ))
    # Attachments (tickets/confirmations) can carry personal data, so they are
    # scoped to the route's team — visible only to the owner, its team, and
    # admins — unlike the otherwise shared route metadata.
    can_edit = _can_edit_route(session, route, user)
    attachments = session.exec(
        select(RouteAttachment).where(RouteAttachment.route_id == route.id).order_by(RouteAttachment.uploaded_at)
    ).all() if can_edit else []
    share = _share_of(session, route.id) if can_edit else None
    return RouteDetail(
        id=route.id, name=route.name, start_date=route.start_date,
        end_date=route.end_date, round_trip=route.round_trip, scheduled_end_date=d["end_date"],
        node_count=len(nodes), created_by=route.created_by,
        owner_username=_username(session, route.created_by),
        team_id=route.team_id, team_name=_team_name(session, route.team_id),
        can_edit=can_edit,
        nodes=node_reads,
        legs=[RouteLegRead(from_node_id=l.from_node_id, to_node_id=l.to_node_id,
                           distance_m=l.distance_m, duration_s=l.duration_s, source=l.source,
                           geometry=l.geometry)
              for l in legs],
        attachments=[_attach_read(a) for a in attachments],
        total_distance_m=d["totals"]["distance_m"], total_duration_s=d["totals"]["duration_s"],
        share=_share_info(request, share) if share else None,
    )


def _detail_and_publish(request: Request, session, route: Route, user: User) -> RouteDetail:
    """Build the route detail (returned to the caller unchanged) and broadcast a
    copy to live subscribers. The broadcast copy drops attachments (team-private)
    and its can_edit is ignored by clients, which keep their own."""
    detail = _detail(session, route, user, request)
    hub = route_hub(request)
    if hub is not None:
        payload = detail.model_dump(mode="json")
        payload["attachments"] = []
        hub.publish(route.id, {
            "type": "update",
            "client_id": request.headers.get("X-Route-Client"),
            "route": payload,
        })
    return detail


def _get_route_or_404(session, route_id: int) -> Route:
    route = session.get(Route, route_id)
    if not route:
        raise HTTPException(status_code=404, detail="Not found")
    return route


def _validate_dates(start: "date", end: "date | None") -> None:
    if end is not None and end < start:
        raise HTTPException(status_code=422, detail="end_date is before start_date")


def _team_name(session, team_id: int | None) -> str | None:
    if team_id is None:
        return None
    team = session.get(Team, team_id)
    return team.name if team else None


def _is_team_member(session, team_id: int, user_id: int) -> bool:
    return session.exec(
        select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
    ).first() is not None


def _assert_can_assign_team(session, team_id: int, user: User) -> None:
    """Assigning a route to a team requires the setter to belong to it; admins may assign to any."""
    if session.get(Team, team_id) is None:
        raise HTTPException(status_code=400, detail="Unknown team_id")
    if user.role != Role.ADMIN and not _is_team_member(session, team_id, user.id):
        raise HTTPException(status_code=403, detail="Not a member of that team")


def _can_edit_route(session, route: Route, user: User) -> bool:
    if user.role == Role.ADMIN or route.created_by == user.id:
        return True
    return route.team_id is not None and _is_team_member(session, route.team_id, user.id)


def require_route_editor(session, route: Route, user: User) -> None:
    if not _can_edit_route(session, route, user):
        raise HTTPException(status_code=403, detail="Not allowed")


def _share_url(request: Request | None, token: str) -> str:
    # request.base_url respects proxy scheme/host once --proxy-headers is on (Part B).
    # When no request is available (e.g. building RouteDetail without one),
    # fall back to a relative URL.
    if request is None:
        return f"/s/{token}"
    return f"{str(request.base_url).rstrip('/')}/s/{token}"


def _share_of(session, route_id: int) -> RouteShare | None:
    return session.exec(select(RouteShare).where(RouteShare.route_id == route_id)).first()


def _share_info(request: Request | None, share: RouteShare) -> ShareInfo:
    return ShareInfo(token=share.token, url=_share_url(request, share.token),
                     expires_at=share.expires_at, password_set=share.password_hash is not None)


def _assert_can_edit(session, route: Route, user: User) -> None:
    if not _can_edit_route(session, route, user):
        raise HTTPException(status_code=403, detail="Not allowed")


@router.get("", response_model=list[RouteSummary], dependencies=[Gate])
def list_routes(session: SessionDep, _: CurrentUser) -> list[RouteSummary]:
    routes = session.exec(select(Route).order_by(Route.created_at.desc())).all()
    return [_summary(session, r) for r in routes]


@router.post("", response_model=RouteDetail, status_code=status.HTTP_201_CREATED, dependencies=[Gate])
@limiter.limit(WRITE_LIMIT, key_func=user_or_ip)
def create_route(request: Request, body: RouteCreate, session: SessionDep, user: CurrentUser) -> RouteDetail:
    _validate_dates(body.start_date, body.end_date)
    if body.team_id is not None:
        _assert_can_assign_team(session, body.team_id, user)
    route = Route(name=body.name, start_date=body.start_date, end_date=body.end_date,
                  round_trip=body.round_trip, team_id=body.team_id, created_by=user.id)
    session.add(route)
    session.commit()
    session.refresh(route)
    return _detail_and_publish(request, session, route, user)


@router.get("/{route_id}", response_model=RouteDetail, dependencies=[Gate])
def get_route(route_id: int, session: SessionDep, user: CurrentUser) -> RouteDetail:
    return _detail(session, _get_route_or_404(session, route_id), user)


async def _route_event_stream(request: Request, hub: RouteEventHub, route_id: int):
    """Async generator behind the SSE endpoint. Module-level (not a closure) so
    it can be driven directly in tests: this repo's sync TestClient drains the
    whole ASGI response before returning, which would hang on an infinite stream."""
    q = hub.subscribe(route_id)
    try:
        yield ": connected\n\n"
        idle = 0
        while True:
            if await request.is_disconnected():
                break
            try:
                event = q.get_nowait()
            except _queue.Empty:
                event = None
            if event is not None:
                yield "data: " + json.dumps(event) + "\n\n"
                idle = 0
                continue
            await asyncio.sleep(0.25)
            idle += 1
            if idle >= 80:
                yield ": keepalive\n\n"
                idle = 0
    finally:
        hub.unsubscribe(route_id, q)


@router.get("/{route_id}/events", dependencies=[Gate])
async def route_events(route_id: int, request: Request, session: SessionDep, _: CurrentUser):
    """SSE stream of live route updates. Readable by any authenticated user
    (mirrors get_route). Emits JSON envelopes: {type, client_id, route}."""
    _get_route_or_404(session, route_id)
    hub = route_hub(request)
    if hub is None:
        raise HTTPException(status_code=503, detail="Live updates unavailable")
    return StreamingResponse(
        _route_event_stream(request, hub, route_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@router.get("/{route_id}/export", dependencies=[Gate])
@limiter.limit(WRITE_LIMIT, key_func=user_or_ip)
def export_route(route_id: int, request: Request, session: SessionDep, _: CurrentUser, format: str = "geojson"):
    """Any member may read — a route is a shared collection, so no owner check.
    `format` selects GeoJSON (default), GPX, or KML."""
    route = _get_route_or_404(session, route_id)
    nodes = ordered_nodes(session, route_id)
    if format == "gpx":
        return Response(content=route_to_gpx(route.name, nodes), media_type="application/gpx+xml")
    if format == "kml":
        return Response(content=route_to_kml(route.name, nodes), media_type="application/vnd.google-earth.kml+xml")
    if format != "geojson":
        raise HTTPException(status_code=400, detail="Unknown format (use geojson, gpx, or kml)")
    return route_to_geojson(route.name, nodes)


@router.patch("/{route_id}", response_model=RouteDetail, dependencies=[Gate])
@limiter.limit(WRITE_LIMIT, key_func=user_or_ip)
async def update_route(route_id: int, request: Request, body: RouteUpdate, session: SessionDep, user: CurrentUser) -> RouteDetail:
    route = _get_route_or_404(session, route_id)
    require_route_editor(session, route, user)
    data = body.model_dump(exclude_unset=True)
    _validate_dates(
        data.get("start_date", route.start_date),
        data.get("end_date", route.end_date),
    )
    if "team_id" in data and data["team_id"] != route.team_id:
        if route.created_by != user.id and user.role != Role.ADMIN:
            raise HTTPException(status_code=403, detail="Only the owner or an admin can change the team")
        if data["team_id"] is not None:
            _assert_can_assign_team(session, data["team_id"], user)
    for k, v in data.items():
        setattr(route, k, v)
    route.updated_at = utcnow()
    session.add(route)
    session.commit()
    if "round_trip" in data:
        session.refresh(route)
        _sync_round_trip(session, route)
        await recompute_legs(session, route_id)
    session.refresh(route)
    return _detail_and_publish(request, session, route, user)


@router.delete("/{route_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Gate])
@limiter.limit(WRITE_LIMIT, key_func=user_or_ip)
def delete_route(route_id: int, request: Request, session: SessionDep, user: CurrentUser) -> Response:
    route = _get_route_or_404(session, route_id)
    require_route_editor(session, route, user)
    # Explicit child cleanup (no DB-level cascade configured on these tables).
    for a in session.exec(select(RouteAttachment).where(RouteAttachment.route_id == route_id)).all():
        att.remove(a.stored_filename)
        session.delete(a)
    for model in (RouteLeg, RouteNode):
        for row in session.exec(select(model).where(model.route_id == route_id)).all():
            session.delete(row)
    share = _share_of(session, route_id)
    if share is not None:
        session.delete(share)
    session.delete(route)
    session.commit()
    hub = route_hub(request)
    if hub is not None:
        hub.publish(route_id, {
            "type": "deleted",
            "client_id": request.headers.get("X-Route-Client"),
            "route": None,
        })
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/{route_id}/share", response_model=ShareInfo, dependencies=[Gate])
@limiter.limit(WRITE_LIMIT, key_func=user_or_ip)
def put_share(route_id: int, body: ShareSettingsUpdate, request: Request,
              session: SessionDep, user: CurrentUser) -> ShareInfo:
    """Create-or-update the route's single public share link (upsert)."""
    route = _get_route_or_404(session, route_id)
    _assert_can_edit(session, route, user)
    share = _share_of(session, route_id)
    if share is None:
        share = RouteShare(token=secrets.token_urlsafe(32), route_id=route_id, created_by=user.id)
        session.add(share)
    share.expires_at = body.expires_at
    if body.remove_password:
        share.password_hash = None
    elif body.password:
        share.password_hash = hash_password(body.password)
    session.commit()
    session.refresh(share)
    return _share_info(request, share)


@router.post("/{route_id}/share/regenerate", response_model=ShareInfo, dependencies=[Gate])
@limiter.limit(WRITE_LIMIT, key_func=user_or_ip)
def regenerate_share(route_id: int, request: Request, session: SessionDep, user: CurrentUser) -> ShareInfo:
    """Rotate the share token, invalidating any previously distributed link."""
    route = _get_route_or_404(session, route_id)
    _assert_can_edit(session, route, user)
    share = _share_of(session, route_id)
    if share is None:
        raise HTTPException(status_code=404, detail="Not shared")
    share.token = secrets.token_urlsafe(32)
    session.commit()
    session.refresh(share)
    return _share_info(request, share)


@router.delete("/{route_id}/share", status_code=204, dependencies=[Gate])
def delete_share(route_id: int, session: SessionDep, user: CurrentUser) -> None:
    """Revoke the route's public share link."""
    route = _get_route_or_404(session, route_id)
    _assert_can_edit(session, route, user)
    share = _share_of(session, route_id)
    if share is not None:
        session.delete(share)
        session.commit()


def _next_position(session, route_id: int) -> float:
    """Append after the last MIDDLE node. Role nodes (start/end) are pinned by
    rank in ordered_nodes and must NOT drive the append position, or a pinned
    end would push new nodes past it / into position collisions."""
    positions = [
        n.position for n in session.exec(
            select(RouteNode).where(RouteNode.route_id == route_id, RouteNode.role.is_(None))
        ).all()
    ]
    return (max(positions) + 1.0) if positions else 1.0


def _sync_round_trip(session, route: Route) -> None:
    """Keep an end node mirroring the start place while round_trip is on. No-op
    when round_trip is off or there is no start yet. Idempotent."""
    if not route.round_trip:
        return
    nodes = session.exec(select(RouteNode).where(RouteNode.route_id == route.id)).all()
    start = next((n for n in nodes if n.role == NodeRole.START), None)
    if start is None:
        return
    end = next((n for n in nodes if n.role == NodeRole.END), None)
    if end is None:
        end = RouteNode(route_id=route.id, kind=RouteNodeKind.STOP, role=NodeRole.END,
                        position=_next_position(session, route.id), name=start.name, lat=start.lat, lng=start.lng)
    end.poi_id = start.poi_id
    end.name = start.name
    end.lat = start.lat
    end.lng = start.lng
    session.add(end)
    session.commit()


def _resolve_location(session, body: RouteNodeCreate) -> tuple[int | None, str, float, float]:
    """A node is either a POI reference (snapshot its name/lat/lng) or an ad-hoc
    point (name+lat+lng required)."""
    if body.poi_id is not None:
        poi = session.get(POI, body.poi_id)
        if not poi:
            raise HTTPException(status_code=400, detail="Unknown poi_id")
        return poi.id, poi.name, poi.lat, poi.lng
    if body.name and body.lat is not None and body.lng is not None:
        return None, body.name, body.lat, body.lng
    raise HTTPException(status_code=400, detail="Provide poi_id or name+lat+lng")


@router.post("/{route_id}/nodes", response_model=RouteDetail, status_code=status.HTTP_201_CREATED, dependencies=[Gate])
@limiter.limit(WRITE_LIMIT, key_func=user_or_ip)
async def add_node(route_id: int, request: Request, body: RouteNodeCreate, session: SessionDep, user: CurrentUser) -> RouteDetail:
    route = _get_route_or_404(session, route_id)
    require_route_editor(session, route, user)
    if body.role is not None:
        exists = session.exec(
            select(RouteNode).where(RouteNode.route_id == route_id, RouteNode.role == body.role)
        ).first()
        if exists:
            raise HTTPException(status_code=409, detail=f"Route already has a {body.role.value}")
    poi_id, name, lat, lng = _resolve_location(session, body)
    # A start/end place is always a single point: coerce to a stop, drop nights.
    kind = RouteNodeKind.STOP if body.role is not None else body.kind
    node = RouteNode(
        route_id=route_id, kind=kind, role=body.role, poi_id=poi_id, name=name, lat=lat, lng=lng,
        nights=body.nights if kind.value == "stay" else None,
        day_offset=body.day_offset if kind.value == "stop" and body.role is None else None,
        notes=body.notes,
        position=body.position if body.position is not None else _next_position(session, route_id),
    )
    session.add(node)
    session.commit()
    _sync_round_trip(session, route)
    await recompute_legs(session, route_id)
    return _detail_and_publish(request, session, route, user)


@router.patch("/{route_id}/nodes/{node_id}", response_model=RouteDetail, dependencies=[Gate])
@limiter.limit(WRITE_LIMIT, key_func=user_or_ip)
async def update_node(route_id: int, node_id: int, request: Request, body: RouteNodeUpdate, session: SessionDep, user: CurrentUser) -> RouteDetail:
    route = _get_route_or_404(session, route_id)
    require_route_editor(session, route, user)
    node = session.get(RouteNode, node_id)
    if not node or node.route_id != route_id:
        raise HTTPException(status_code=404, detail="Not found")
    data = body.model_dump(exclude_unset=True)
    # A location change (poi_id, or name+lat+lng) re-resolves the point and is set
    # atomically; nights/notes/position/day_offset keep the generic path.
    location_keys = {"poi_id", "name", "lat", "lng"}
    if location_keys & data.keys():
        poi_id, name, lat, lng = _resolve_location(session, body)
        node.poi_id, node.name, node.lat, node.lng = poi_id, name, lat, lng
        for k in location_keys:
            data.pop(k, None)
    for k, v in data.items():
        setattr(node, k, v)
    session.add(node)
    session.commit()
    _sync_round_trip(session, route)  # relocating the start re-mirrors the end
    await recompute_legs(session, route_id)  # position/location may change the order
    return _detail_and_publish(request, session, route, user)


@router.delete("/{route_id}/nodes/{node_id}", response_model=RouteDetail, dependencies=[Gate])
@limiter.limit(WRITE_LIMIT, key_func=user_or_ip)
async def delete_node(route_id: int, node_id: int, request: Request, session: SessionDep, user: CurrentUser) -> RouteDetail:
    route = _get_route_or_404(session, route_id)
    require_route_editor(session, route, user)
    node = session.get(RouteNode, node_id)
    if not node or node.route_id != route_id:
        raise HTTPException(status_code=404, detail="Not found")
    # Clean up attachments scoped to this node (no DB-level cascade configured).
    for a in session.exec(select(RouteAttachment).where(RouteAttachment.node_id == node_id)).all():
        att.remove(a.stored_filename)
        session.delete(a)
    session.delete(node)
    session.commit()
    _sync_round_trip(session, route)
    await recompute_legs(session, route_id)
    return _detail_and_publish(request, session, route, user)


@router.post("/{route_id}/recompute", response_model=RouteDetail, dependencies=[Gate])
@limiter.limit(GOOGLE_LIMIT, key_func=user_or_ip)
async def recompute_route(route_id: int, request: Request, session: SessionDep, user: CurrentUser) -> RouteDetail:
    """Manual refresh — re-runs leg computation (may hit paid Google Directions
    calls), hence the tighter GOOGLE_LIMIT instead of WRITE_LIMIT."""
    route = _get_route_or_404(session, route_id)
    require_route_editor(session, route, user)
    await recompute_legs(session, route_id)
    return _detail_and_publish(request, session, route, user)


def _attach_read(a: RouteAttachment) -> RouteAttachmentRead:
    return RouteAttachmentRead(
        id=a.id, route_id=a.route_id, node_id=a.node_id, filename=a.filename,
        content_type=a.content_type, size=a.size, uploaded_by=a.uploaded_by, uploaded_at=a.uploaded_at,
    )


@router.post("/{route_id}/attachments", response_model=RouteAttachmentRead, status_code=201, dependencies=[Gate])
@limiter.limit(UPLOAD_LIMIT, key_func=user_or_ip)
async def upload_attachment(route_id: int, request: Request, session: SessionDep, user: CurrentUser,
                            file: UploadFile = File(...), node_id: int | None = Form(default=None)) -> RouteAttachmentRead:
    route = _get_route_or_404(session, route_id)
    require_route_editor(session, route, user)
    # Read at most one byte past the limit so an oversized upload is rejected
    # without ever buffering the whole (potentially multi-GB) body in memory.
    data = await file.read(att.MAX_ATTACHMENT_BYTES + 1)
    if len(data) > att.MAX_ATTACHMENT_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 10 MB)")
    mime = att.sniff(data)
    if mime is None:
        raise HTTPException(status_code=415, detail="Unsupported file (PDF, PNG, JPEG, WebP only)")
    if node_id is not None:
        node = session.get(RouteNode, node_id)
        if not node or node.route_id != route_id:
            raise HTTPException(status_code=400, detail="Unknown node_id")
    stored = att.save(data, att.ALLOWED[mime])
    row = RouteAttachment(route_id=route_id, node_id=node_id, filename=file.filename or "file",
                          stored_filename=stored, content_type=mime, size=len(data), uploaded_by=user.id)
    session.add(row)
    session.commit()
    session.refresh(row)
    return _attach_read(row)


@router.get("/{route_id}/attachments/{aid}", dependencies=[Gate])
def download_attachment(route_id: int, aid: int, session: SessionDep, user: CurrentUser):
    """Attachments are team-scoped: only the owner, the route's team, and admins
    may download them."""
    route = _get_route_or_404(session, route_id)
    require_route_editor(session, route, user)
    row = session.get(RouteAttachment, aid)
    if not row or row.route_id != route_id:
        raise HTTPException(status_code=404, detail="Not found")
    path = att.attachments_dir() / row.stored_filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(str(path), media_type=row.content_type, filename=row.filename)


@router.delete("/{route_id}/attachments/{aid}", status_code=204, dependencies=[Gate])
@limiter.limit(WRITE_LIMIT, key_func=user_or_ip)
def delete_attachment(route_id: int, aid: int, request: Request, session: SessionDep, user: CurrentUser) -> Response:
    route = _get_route_or_404(session, route_id)
    require_route_editor(session, route, user)
    row = session.get(RouteAttachment, aid)
    if not row or row.route_id != route_id:
        raise HTTPException(status_code=404, detail="Not found")
    att.remove(row.stored_filename)
    session.delete(row)
    session.commit()
    return Response(status_code=204)
