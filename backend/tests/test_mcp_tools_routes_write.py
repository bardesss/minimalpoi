import pytest

from app import db
from app.apitokens import generate_api_token
from app.models import ApiToken, Role, Settings, User
from app.security import hash_password
from sqlmodel import Session, select


@pytest.fixture
def anyio_backend():
    return "asyncio"


def _auth(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "password123"})
    with Session(db.engine) as s:
        user = s.exec(select(User).where(User.username == "admin")).first()
        full, prefix, token_hash = generate_api_token()
        s.add(ApiToken(user_id=user.id, name="t", token_hash=token_hash, prefix=prefix))
        s.commit()
    return f"Bearer {full}"


def _member_token(client, username="mallory"):
    with Session(db.engine) as s:
        u = User(username=username, password_hash=hash_password("password123"), role=Role.MEMBER)
        s.add(u); s.commit(); s.refresh(u)
        full, prefix, token_hash = generate_api_token()
        s.add(ApiToken(user_id=u.id, name="t", token_hash=token_hash, prefix=prefix))
        s.commit()
    return f"Bearer {full}"


def _enable_routes():
    with Session(db.engine) as s:
        row = s.get(Settings, 1) or Settings(id=1)
        row.routes_enabled = True
        s.add(row); s.commit()


@pytest.mark.anyio
async def test_route_and_node_update_delete(client):
    auth = _auth(client)
    _enable_routes()
    from app.mcp_tools_routes import (
        _create_route, _add_route_stay, _update_route, _update_route_node,
        _delete_route_node, _delete_route,
    )
    route = await _create_route(auth, {"name": "Trip", "start_date": "2026-08-01"})
    rid = route["id"]

    renamed = await _update_route(auth, rid, {"name": "Summer Trip"})
    assert renamed["name"] == "Summer Trip"

    with_stay = await _add_route_stay(auth, rid, {"name": "Hotel", "lat": 52.1, "lng": 4.1, "nights": 2})
    node_id = next(n["id"] for n in with_stay["nodes"] if n["kind"] == "stay")

    renoted = await _update_route_node(auth, rid, node_id, {"notes": "sea view"})
    assert any(n["id"] == node_id and n["notes"] == "sea view" for n in renoted["nodes"])

    after_node_del = await _delete_route_node(auth, rid, node_id)
    assert all(n["id"] != node_id for n in after_node_del["nodes"])

    assert (await _delete_route(auth, rid)) == {"deleted": rid}
    gone = client.get(f"/api/routes/{rid}", headers={"Authorization": auth})
    assert gone.status_code == 404


@pytest.mark.anyio
async def test_non_editor_cannot_update_or_delete_route(client):
    owner = _auth(client)
    _enable_routes()
    from app.mcp_tools_routes import _create_route, _update_route, _delete_route
    route = await _create_route(owner, {"name": "Trip", "start_date": "2026-08-01"})
    rid = route["id"]

    other = _member_token(client)
    with pytest.raises(ValueError) as e:
        await _update_route(other, rid, {"name": "Hijacked"})
    assert "403" in str(e.value)

    with pytest.raises(ValueError) as e:
        await _delete_route(other, rid)
    assert "403" in str(e.value)


@pytest.mark.anyio
async def test_set_route_start_creates_then_relocates(client):
    auth = _auth(client)
    _enable_routes()
    from app.mcp_tools_routes import _create_route, _set_role_node

    rid = (await _create_route(auth, {"name": "Trip", "start_date": "2026-08-01"}))["id"]

    created = await _set_role_node(auth, rid, "start", {"name": "Home", "lat": 52.0, "lng": 4.0})
    start = next(n for n in created["nodes"] if n["role"] == "start")
    assert start["name"] == "Home"
    assert start["kind"] == "stop"          # role nodes are coerced to a single point

    moved = await _set_role_node(auth, rid, "start", {"name": "Office", "lat": 51.9, "lng": 4.5})
    starts = [n for n in moved["nodes"] if n["role"] == "start"]
    assert len(starts) == 1                 # relocated, not a second start (POST would 409)
    assert starts[0]["id"] == start["id"]
    assert starts[0]["name"] == "Office"


@pytest.mark.anyio
async def test_set_route_start_accepts_a_poi_id(client):
    auth = _auth(client)
    _enable_routes()
    poi = client.post("/api/pois", json={"name": "Depot", "lat": 51.5, "lng": 4.4},
                      headers={"Authorization": auth}).json()
    from app.mcp_tools_routes import _create_route, _set_role_node

    rid = (await _create_route(auth, {"name": "Trip", "start_date": "2026-08-01"}))["id"]
    detail = await _set_role_node(auth, rid, "start", {"poi_id": poi["id"]})

    start = next(n for n in detail["nodes"] if n["role"] == "start")
    assert start["poi_id"] == poi["id"]
    assert start["name"] == "Depot"          # snapshotted so it survives POI deletion
    assert start["lat"] == 51.5


@pytest.mark.anyio
async def test_start_and_end_coexist_with_middle_stops(client):
    auth = _auth(client)
    _enable_routes()
    from app.mcp_tools_routes import _create_route, _add_route_stop, _set_role_node

    rid = (await _create_route(auth, {"name": "Trip", "start_date": "2026-08-01"}))["id"]
    await _set_role_node(auth, rid, "start", {"name": "Home", "lat": 52.0, "lng": 4.0})
    await _add_route_stop(auth, rid, {"name": "Middle", "lat": 51.7, "lng": 4.2})
    detail = await _set_role_node(auth, rid, "end", {"name": "Airport", "lat": 51.4, "lng": 4.8})

    roles = [n["role"] for n in detail["nodes"]]
    assert roles.count("start") == 1 and roles.count("end") == 1
    assert any(n["role"] is None and n["name"] == "Middle" for n in detail["nodes"])


@pytest.mark.anyio
async def test_set_route_end_rejects_round_trip_routes(client):
    # _sync_round_trip copies the start onto the end on every write, so an accepted
    # set_route_end would be silently overwritten. Fail loudly instead.
    auth = _auth(client)
    _enable_routes()
    from app.mcp_tools_routes import _create_route, _set_role_node

    rid = (await _create_route(auth, {
        "name": "Loop", "start_date": "2026-08-01", "round_trip": True,
    }))["id"]
    await _set_role_node(auth, rid, "start", {"name": "Home", "lat": 52.0, "lng": 4.0})

    with pytest.raises(ValueError) as e:
        await _set_role_node(auth, rid, "end", {"name": "Elsewhere", "lat": 50.0, "lng": 3.0})

    assert "round trip" in str(e.value)


@pytest.mark.anyio
async def test_non_editor_cannot_set_a_route_start(client):
    owner = _auth(client)
    _enable_routes()
    from app.mcp_tools_routes import _create_route, _set_role_node

    rid = (await _create_route(owner, {"name": "Trip", "start_date": "2026-08-01"}))["id"]
    other = _member_token(client)

    with pytest.raises(ValueError) as e:
        await _set_role_node(other, rid, "start", {"name": "Hijacked", "lat": 1.0, "lng": 2.0})
    assert "403" in str(e.value) or "404" in str(e.value)
