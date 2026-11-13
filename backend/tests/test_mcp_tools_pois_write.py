import pytest

from app import db
from app.apitokens import generate_api_token
from app.models import ApiToken, Role, User
from app.security import hash_password
from sqlmodel import Session, select


@pytest.fixture
def anyio_backend():
    return "asyncio"


def _first_admin_token(client):
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


@pytest.mark.anyio
async def test_update_and_delete_poi(client):
    auth = _first_admin_token(client)
    created = client.post("/api/pois", json={"name": "Cafe", "lat": 52.1, "lng": 4.1},
                          headers={"Authorization": auth})
    poi_id = created.json()["id"]

    from app.mcp_tools_pois import _update_poi, _delete_poi
    updated = await _update_poi(auth, poi_id, {"name": "Cafe Renamed", "notes": "great"})
    assert updated["name"] == "Cafe Renamed" and updated["notes"] == "great"

    assert (await _delete_poi(auth, poi_id)) == {"deleted": poi_id}
    gone = client.get(f"/api/pois/{poi_id}", headers={"Authorization": auth})
    assert gone.status_code == 404


@pytest.mark.anyio
async def test_non_owner_cannot_delete_poi(client):
    owner = _first_admin_token(client)
    created = client.post("/api/pois", json={"name": "Owned", "lat": 1.0, "lng": 2.0},
                          headers={"Authorization": owner})
    poi_id = created.json()["id"]

    other = _member_token(client)
    from app.mcp_tools_pois import _delete_poi
    with pytest.raises(ValueError) as e:
        await _delete_poi(other, poi_id)
    assert "403" in str(e.value)


class _Ctx:
    """Minimal stand-in for mcp Context: only what _bearer reads."""
    def __init__(self, auth):
        class _Req:
            headers = {"authorization": auth}
        class _RC:
            request = _Req()
        self.request_context = _RC()


@pytest.mark.anyio
async def test_mcp_update_poi_clear_notes(client):
    auth = _first_admin_token(client)
    poi_id = client.post("/api/pois", json={"name": "Cafe", "lat": 52.1, "lng": 4.1, "notes": "great"},
                         headers={"Authorization": auth}).json()["id"]
    from app.mcp_tools_pois import update_poi
    ctx = _Ctx(auth)

    cleared = await update_poi(poi_id, ctx, clear=["notes"])
    assert cleared["notes"] is None and cleared["name"] == "Cafe"

    with pytest.raises(ValueError, match=r"Cannot clear name\. Clearable fields:.*notes"):
        await update_poi(poi_id, ctx, clear=["name"])
    with pytest.raises(ValueError, match="Clearable fields"):
        await update_poi(poi_id, ctx, clear=["bogus"])
