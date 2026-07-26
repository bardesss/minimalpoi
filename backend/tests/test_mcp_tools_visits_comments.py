import pytest

from app import db
from app.apitokens import generate_api_token
from app.models import ApiToken, User
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


@pytest.mark.anyio
async def test_visit_set_and_delete(client):
    auth = _auth(client)
    poi_id = client.post("/api/pois", json={"name": "Cafe", "lat": 1.0, "lng": 2.0},
                         headers={"Authorization": auth}).json()["id"]
    from app.mcp_tools_pois import _set_visit, _delete_visit
    visit = await _set_visit(auth, poi_id, {"rating": 5})
    assert visit["rating"] == 5 and visit["poi_id"] == poi_id
    assert (await _delete_visit(auth, poi_id)) == {"deleted_visit": poi_id}


@pytest.mark.anyio
async def test_comment_add_update_delete(client):
    auth = _auth(client)
    poi_id = client.post("/api/pois", json={"name": "Cafe", "lat": 1.0, "lng": 2.0},
                         headers={"Authorization": auth}).json()["id"]
    from app.mcp_tools_pois import _add_comment, _update_comment, _delete_comment
    c = await _add_comment(auth, poi_id, "nice spot")
    cid = c["id"]
    assert c["text"] == "nice spot"
    upd = await _update_comment(auth, poi_id, cid, "great spot")
    assert upd["text"] == "great spot"
    assert (await _delete_comment(auth, poi_id, cid)) == {"deleted_comment": cid}
