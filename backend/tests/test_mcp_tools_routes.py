import pytest

from app import db
from app.apitokens import generate_api_token
from app.models import ApiToken, Settings, User
from sqlmodel import Session, select


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


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_disabled_module_errors_cleanly(client):
    auth = _auth(client)
    from app.mcp_tools_routes import _list_routes
    with pytest.raises(ValueError) as e:
        await _list_routes(auth)
    assert "404" in str(e.value)


@pytest.mark.anyio
async def test_create_route_and_add_nodes(client):
    auth = _auth(client)
    _enable_routes()
    from app.mcp_tools_routes import _create_route, _add_route_stay, _get_route
    route = await _create_route(auth, {"name": "Trip", "start_date": "2026-08-01"})
    rid = route["id"]
    updated = await _add_route_stay(auth, rid,
                                    {"name": "Hotel", "lat": 52.1, "lng": 4.1, "nights": 2})
    assert any(n["kind"] == "stay" for n in updated["nodes"])
    fetched = await _get_route(auth, rid)
    assert fetched["name"] == "Trip"
