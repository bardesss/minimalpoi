from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlmodel import select

from ..deps import CurrentUser, SessionDep, require_owner_or_admin
from ..models import (
    Route,
    RouteLeg,
    RouteNode,
    User,
    get_or_create_settings,
    utcnow,
)
from ..ratelimit import WRITE_LIMIT, limiter, user_or_ip
from ..routing.service import derive, legs_for, ordered_nodes
from ..schemas import (
    RouteCreate,
    RouteDetail,
    RouteLegRead,
    RouteNodeRead,
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
        id=route.id, name=route.name, start_date=route.start_date, end_date=d["end_date"],
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
    return RouteDetail(
        id=route.id, name=route.name, start_date=route.start_date, end_date=d["end_date"],
        node_count=len(nodes), created_by=route.created_by,
        owner_username=_username(session, route.created_by),
        nodes=node_reads,
        legs=[RouteLegRead(from_node_id=l.from_node_id, to_node_id=l.to_node_id,
                           distance_m=l.distance_m, duration_s=l.duration_s, source=l.source)
              for l in legs],
        total_distance_m=d["totals"]["distance_m"], total_duration_s=d["totals"]["duration_s"],
    )


def _get_route_or_404(session, route_id: int) -> Route:
    route = session.get(Route, route_id)
    if not route:
        raise HTTPException(status_code=404, detail="Not found")
    return route


@router.get("", response_model=list[RouteSummary], dependencies=[Gate])
def list_routes(session: SessionDep, _: CurrentUser) -> list[RouteSummary]:
    routes = session.exec(select(Route).order_by(Route.created_at.desc())).all()
    return [_summary(session, r) for r in routes]


@router.post("", response_model=RouteDetail, status_code=status.HTTP_201_CREATED, dependencies=[Gate])
@limiter.limit(WRITE_LIMIT, key_func=user_or_ip)
def create_route(request: Request, body: RouteCreate, session: SessionDep, user: CurrentUser) -> RouteDetail:
    route = Route(name=body.name, start_date=body.start_date, created_by=user.id)
    session.add(route)
    session.commit()
    session.refresh(route)
    return _detail(session, route)


@router.get("/{route_id}", response_model=RouteDetail, dependencies=[Gate])
def get_route(route_id: int, session: SessionDep, _: CurrentUser) -> RouteDetail:
    return _detail(session, _get_route_or_404(session, route_id))


@router.patch("/{route_id}", response_model=RouteDetail, dependencies=[Gate])
@limiter.limit(WRITE_LIMIT, key_func=user_or_ip)
def update_route(route_id: int, request: Request, body: RouteUpdate, session: SessionDep, user: CurrentUser) -> RouteDetail:
    route = _get_route_or_404(session, route_id)
    require_owner_or_admin(route.created_by, user)
    data = body.model_dump(exclude_unset=True)
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
    for model in (RouteLeg, RouteNode):
        for row in session.exec(select(model).where(model.route_id == route_id)).all():
            session.delete(row)
    session.delete(route)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
