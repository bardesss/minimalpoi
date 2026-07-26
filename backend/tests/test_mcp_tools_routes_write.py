import pytest

from app import db
from app.apitokens import generate_api_token
from app.models import ApiToken, Settings, User
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
