import pytest

from app import db
from app.apitokens import generate_api_token
from app.models import ApiToken, User
from sqlmodel import Session


def _token_and_login(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "password123"})
    with Session(db.engine) as s:
        user = s.exec(__import__("sqlmodel").select(User).where(User.username == "admin")).first()
        full, prefix, token_hash = generate_api_token()
        s.add(ApiToken(user_id=user.id, name="t", token_hash=token_hash, prefix=prefix))
        s.commit()
    return full


@pytest.mark.anyio
async def test_list_and_get_poi(client):
    auth = f"Bearer {_token_and_login(client)}"
    # Create a POI through the API so the tool has something to read.
    client.post("/api/pois", json={"name": "Cafe", "lat": 52.1, "lng": 4.1},
                headers={"Authorization": auth})

    from app.mcp_tools_pois import _list_pois, _get_poi, _list_categories, _list_tags
    pois = await _list_pois(auth)
    assert any(p["name"] == "Cafe" for p in pois)
    one = await _get_poi(auth, pois[0]["id"])
    assert one["name"] == "Cafe"
    assert isinstance(await _list_categories(auth), list)
    assert isinstance(await _list_tags(auth), list)


@pytest.fixture
def anyio_backend():
    return "asyncio"
