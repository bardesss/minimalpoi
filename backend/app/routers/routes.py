from datetime import date

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlmodel import select

from .. import attachments as att
from ..deps import CurrentUser, SessionDep, require_owner_or_admin
from ..models import (
    POI,
    Route,
    RouteAttachment,
    RouteLeg,
    RouteNode,
    User,
    get_or_create_settings,
    utcnow,
)
from ..ratelimit import GOOGLE_LIMIT, UPLOAD_LIMIT, WRITE_LIMIT, limiter, user_or_ip
from ..routes_export import route_to_geojson
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
)

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
        end_date=route.end_date, scheduled_end_date=d["end_date"],
        node_count=len(nodes), created_by=route.created_by,
        owner_username=_username(session, route.created_by),
    )


def _detail(session, route: Route) -> RouteDetail:
    nodes = ordered_nodes(session, route.id)
    legs = legs_for(session, route.id)
    d = derive(nodes, legs, route.start_date)
    node_reads = []
    for n in nodes:
        extra = d["stays"].get(n.id, {})
        node_reads.append(RouteNodeRead(
            id=n.id, kind=n.kind, position=n.position, nights=n.nights, notes=n.notes,
            poi_id=n.poi_id, name=n.name, lat=n.lat, lng=n.lng, **extra,
        ))
    attachments = session.exec(
        select(RouteAttachment).where(RouteAttachment.route_id == route.id).order_by(RouteAttachment.uploaded_at)
    ).all()
    return RouteDetail(
        id=route.id, name=route.name, start_date=route.start_date,
        end_date=route.end_date, scheduled_end_date=d["end_date"],
        node_count=len(nodes), created_by=route.created_by,
        owner_username=_username(session, route.created_by),
        nodes=node_reads,
        legs=[RouteLegRead(from_node_id=l.from_node_id, to_node_id=l.to_node_id,
                           distance_m=l.distance_m, duration_s=l.duration_s, source=l.source)
              for l in legs],
        attachments=[_attach_read(a) for a in attachments],
        total_distance_m=d["totals"]["distance_m"], total_duration_s=d["totals"]["duration_s"],
    )


def _get_route_or_404(session, route_id: int) -> Route:
    route = session.get(Route, route_id)
    if not route:
        raise HTTPException(status_code=404, detail="Not found")
    return route


def _validate_dates(start: "date", end: "date | None") -> None:
    if end is not None and end < start:
        raise HTTPException(status_code=422, detail="end_date is before start_date")


@router.get("", response_model=list[RouteSummary], dependencies=[Gate])
def list_routes(session: SessionDep, _: CurrentUser) -> list[RouteSummary]:
    routes = session.exec(select(Route).order_by(Route.created_at.desc())).all()
    return [_summary(session, r) for r in routes]


@router.post("", response_model=RouteDetail, status_code=status.HTTP_201_CREATED, dependencies=[Gate])
@limiter.limit(WRITE_LIMIT, key_func=user_or_ip)
def create_route(request: Request, body: RouteCreate, session: SessionDep, user: CurrentUser) -> RouteDetail:
    _validate_dates(body.start_date, body.end_date)
    route = Route(name=body.name, start_date=body.start_date, end_date=body.end_date, created_by=user.id)
    session.add(route)
    session.commit()
    session.refresh(route)
    return _detail(session, route)


@router.get("/{route_id}", response_model=RouteDetail, dependencies=[Gate])
def get_route(route_id: int, session: SessionDep, _: CurrentUser) -> RouteDetail:
    return _detail(session, _get_route_or_404(session, route_id))


@router.get("/{route_id}/export", dependencies=[Gate])
@limiter.limit(WRITE_LIMIT, key_func=user_or_ip)
def export_route(route_id: int, request: Request, session: SessionDep, _: CurrentUser) -> dict:
    """Any member may read — a route is a shared collection, so no owner check."""
    route = _get_route_or_404(session, route_id)
    return route_to_geojson(route.name, ordered_nodes(session, route_id))


@router.patch("/{route_id}", response_model=RouteDetail, dependencies=[Gate])
@limiter.limit(WRITE_LIMIT, key_func=user_or_ip)
def update_route(route_id: int, request: Request, body: RouteUpdate, session: SessionDep, user: CurrentUser) -> RouteDetail:
    route = _get_route_or_404(session, route_id)
    require_owner_or_admin(route.created_by, user)
    data = body.model_dump(exclude_unset=True)
    _validate_dates(
        data.get("start_date", route.start_date),
        data.get("end_date", route.end_date),
    )
    for k, v in data.items():
        setattr(route, k, v)
    route.updated_at = utcnow()
    session.add(route)
    session.commit()
    session.refresh(route)
    return _detail(session, route)


@router.delete("/{route_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Gate])
@limiter.limit(WRITE_LIMIT, key_func=user_or_ip)
def delete_route(route_id: int, request: Request, session: SessionDep, user: CurrentUser) -> Response:
    route = _get_route_or_404(session, route_id)
    require_owner_or_admin(route.created_by, user)
    # Explicit child cleanup (no DB-level cascade configured on these tables).
    for a in session.exec(select(RouteAttachment).where(RouteAttachment.route_id == route_id)).all():
        att.remove(a.stored_filename)
        session.delete(a)
    for model in (RouteLeg, RouteNode):
        for row in session.exec(select(model).where(model.route_id == route_id)).all():
            session.delete(row)
    session.delete(route)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _next_position(session, route_id: int) -> float:
    nodes = ordered_nodes(session, route_id)
    return (nodes[-1].position + 1.0) if nodes else 1.0


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
    require_owner_or_admin(route.created_by, user)
    poi_id, name, lat, lng = _resolve_location(session, body)
    node = RouteNode(
        route_id=route_id, kind=body.kind, poi_id=poi_id, name=name, lat=lat, lng=lng,
        nights=body.nights if body.kind.value == "stay" else None,
        notes=body.notes,
        position=body.position if body.position is not None else _next_position(session, route_id),
    )
    session.add(node)
    session.commit()
    await recompute_legs(session, route_id)
    return _detail(session, route)


@router.patch("/{route_id}/nodes/{node_id}", response_model=RouteDetail, dependencies=[Gate])
@limiter.limit(WRITE_LIMIT, key_func=user_or_ip)
async def update_node(route_id: int, node_id: int, request: Request, body: RouteNodeUpdate, session: SessionDep, user: CurrentUser) -> RouteDetail:
    route = _get_route_or_404(session, route_id)
    require_owner_or_admin(route.created_by, user)
    node = session.get(RouteNode, node_id)
    if not node or node.route_id != route_id:
        raise HTTPException(status_code=404, detail="Not found")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(node, k, v)
    session.add(node)
    session.commit()
    await recompute_legs(session, route_id)  # position may have changed the order
    return _detail(session, route)


@router.delete("/{route_id}/nodes/{node_id}", response_model=RouteDetail, dependencies=[Gate])
@limiter.limit(WRITE_LIMIT, key_func=user_or_ip)
async def delete_node(route_id: int, node_id: int, request: Request, session: SessionDep, user: CurrentUser) -> RouteDetail:
    route = _get_route_or_404(session, route_id)
    require_owner_or_admin(route.created_by, user)
    node = session.get(RouteNode, node_id)
    if not node or node.route_id != route_id:
        raise HTTPException(status_code=404, detail="Not found")
    # Clean up attachments scoped to this node (no DB-level cascade configured).
    for a in session.exec(select(RouteAttachment).where(RouteAttachment.node_id == node_id)).all():
        att.remove(a.stored_filename)
        session.delete(a)
    session.delete(node)
    session.commit()
    await recompute_legs(session, route_id)
    return _detail(session, route)


@router.post("/{route_id}/recompute", response_model=RouteDetail, dependencies=[Gate])
@limiter.limit(GOOGLE_LIMIT, key_func=user_or_ip)
async def recompute_route(route_id: int, request: Request, session: SessionDep, user: CurrentUser) -> RouteDetail:
    """Manual refresh — re-runs leg computation (may hit paid Google Directions
    calls), hence the tighter GOOGLE_LIMIT instead of WRITE_LIMIT."""
    route = _get_route_or_404(session, route_id)
    require_owner_or_admin(route.created_by, user)
    await recompute_legs(session, route_id)
    return _detail(session, route)


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
    require_owner_or_admin(route.created_by, user)
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
def download_attachment(route_id: int, aid: int, session: SessionDep, _: CurrentUser):
    """Any member may read — a route is a shared collection, so no owner check."""
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
    require_owner_or_admin(route.created_by, user)
    row = session.get(RouteAttachment, aid)
    if not row or row.route_id != route_id:
        raise HTTPException(status_code=404, detail="Not found")
    att.remove(row.stored_filename)
    session.delete(row)
    session.commit()
    return Response(status_code=204)
