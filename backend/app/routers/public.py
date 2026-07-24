"""The public, unauthenticated route-sharing surface.

This router is the ONLY data path that does not depend on ``CurrentUser`` —
access is gated purely by knowing the share token (and, if set, its
password). Keep it minimal and defensive:

- Unknown/expired tokens 404 (no existence or expiry leak).
- Password-protected shares without a valid grant return `locked: true` and
  withhold the route entirely (no partial data on the wire).
- The returned view is a hand-picked subset of route fields — no
  attachments, no owner/team identity, no other POIs — mirroring `_detail`
  in `routes.py` but stripped down to what a stranger with a link should see.
"""
import hashlib
from datetime import timedelta, timezone

import jwt
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from sqlmodel import select

from ..config import get_secret_key
from ..deps import SessionDep
from ..models import Route, RouteShare, get_or_create_settings, utcnow
from ..ratelimit import LOGIN_LIMIT, PUBLIC_LIMIT, limiter
from ..routing.service import derive, legs_for, ordered_nodes
from ..schemas import PublicMapSettings, PublicRouteResponse, PublicRouteView, RouteLegRead, RouteNodeRead, UnlockBody
from ..security import verify_password, verify_password_dummy
from .auth import _cookie_secure

router = APIRouter(prefix="/api/public", tags=["public"])
GRANT_COOKIE = "share_grant"


def _noindex(resp: Response) -> None:
    # Share links can leak into search results via referrers/crawlers; this
    # tells well-behaved crawlers to stay out regardless of who finds the URL.
    resp.headers["X-Robots-Tag"] = "noindex"


def _expired(expires_at) -> bool:
    if expires_at is None:
        return False
    # Values set via the API (ShareSettingsUpdate.expires_at) are typically
    # naive (no tzinfo); utcnow() is tz-aware. Treat naive values as UTC so
    # the comparison below doesn't raise.
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at < utcnow()


def _active_share_or_404(session, token: str) -> RouteShare:
    share = session.exec(select(RouteShare).where(RouteShare.token == token)).first()
    if not share or _expired(share.expires_at):
        # Same 404 for "never existed" and "expired" — an attacker (or the
        # public) can't distinguish a dead link from one that never was.
        raise HTTPException(status_code=404, detail="Not found")
    return share


def _pw_version(share: RouteShare) -> str:
    # A short fingerprint of the current password hash, embedded in the grant
    # so that changing (or clearing-then-resetting) the share's password
    # invalidates any grants issued under the old one — without needing to
    # track/revoke individual JWTs server-side.
    return hashlib.sha256((share.password_hash or "").encode()).hexdigest()[:16]


def _has_grant(request: Request, share: RouteShare) -> bool:
    raw = request.cookies.get(GRANT_COOKIE)
    if not raw:
        return False
    try:
        payload = jwt.decode(raw, get_secret_key(), algorithms=["HS256"])
        return payload.get("share") == share.token and payload.get("pv") == _pw_version(share)
    except jwt.PyJWTError:
        return False


def _view(session, route: Route) -> PublicRouteView:
    nodes = ordered_nodes(session, route.id)
    legs = legs_for(session, route.id)
    d = derive(nodes, legs, route.start_date)
    s = get_or_create_settings(session)
    node_reads = [
        RouteNodeRead(
            id=n.id, kind=n.kind, role=n.role, position=n.position, nights=n.nights,
            notes=n.notes, poi_id=n.poi_id, name=n.name, lat=n.lat, lng=n.lng,
            day_offset=n.day_offset, **d["stays"].get(n.id, {}),
        )
        for n in nodes
    ]
    return PublicRouteView(
        name=route.name, start_date=route.start_date, end_date=route.end_date,
        round_trip=route.round_trip, scheduled_end_date=d["end_date"], node_count=len(nodes),
        nodes=node_reads,
        legs=[
            RouteLegRead(from_node_id=l.from_node_id, to_node_id=l.to_node_id, distance_m=l.distance_m,
                         duration_s=l.duration_s, source=l.source, geometry=l.geometry)
            for l in legs
        ],
        total_distance_m=d["totals"]["distance_m"], total_duration_s=d["totals"]["duration_s"],
        map=PublicMapSettings(
            map_tile_url=s.map_tile_url, default_map_center_lat=s.default_map_center_lat,
            default_map_center_lng=s.default_map_center_lng, default_map_zoom=s.default_map_zoom,
        ),
    )


@router.get("/routes/{token}", response_model=PublicRouteResponse)
@limiter.limit(PUBLIC_LIMIT)
def public_route(token: str, request: Request, response: Response, session: SessionDep) -> PublicRouteResponse:
    _noindex(response)
    share = _active_share_or_404(session, token)
    if share.password_hash is not None and not _has_grant(request, share):
        return PublicRouteResponse(locked=True, route=None)
    route = session.get(Route, share.route_id)
    if not route:
        raise HTTPException(status_code=404, detail="Not found")
    return PublicRouteResponse(locked=False, route=_view(session, route))


@router.post("/routes/{token}/unlock")
@limiter.limit(LOGIN_LIMIT)  # brute-force / credential stuffing — same bucket as login
def unlock(token: str, request: Request, session: SessionDep, body: UnlockBody) -> JSONResponse:
    share = _active_share_or_404(session, token)
    if share.password_hash is None:
        verify_password_dummy()  # equalize timing when there's nothing to unlock
        raise HTTPException(status_code=401, detail="Incorrect password")
    if not verify_password(body.password, share.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect password")
    route = session.get(Route, share.route_id)
    if not route:
        raise HTTPException(status_code=404, detail="Not found")
    grant = jwt.encode(
        {"share": token, "pv": _pw_version(share), "exp": utcnow() + timedelta(hours=12)},
        get_secret_key(), algorithm="HS256",
    )
    resp = JSONResponse(PublicRouteResponse(locked=False, route=_view(session, route)).model_dump(mode="json"))
    resp.headers["X-Robots-Tag"] = "noindex"
    resp.set_cookie(
        GRANT_COOKIE, grant, max_age=12 * 3600, httponly=True, samesite="lax", path="/api/public",
        secure=_cookie_secure(request, session),
    )
    return resp
