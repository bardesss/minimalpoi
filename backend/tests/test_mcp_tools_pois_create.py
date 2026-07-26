import pytest

from app import db
from app.apitokens import generate_api_token
from app.models import ApiToken, User
from sqlmodel import Session, select


def _auth(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "password123"})
    with Session(db.engine) as s:
        user = s.exec(select(User).where(User.username == "admin")).first()
        full, prefix, token_hash = generate_api_token()
        s.add(ApiToken(user_id=user.id, name="t", token_hash=token_hash, prefix=prefix))
        s.commit()
    return f"Bearer {full}"


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_create_poi_and_duplicate(client):
    auth = _auth(client)
    from app.mcp_tools_pois import _create_poi, _check_duplicate
    created = await _create_poi(auth, {"name": "Museum", "lat": 52.37, "lng": 4.89})
    assert created["id"] > 0 and created["name"] == "Museum"
    dup = await _check_duplicate(auth, {"name": "Museum", "lat": 52.37, "lng": 4.89})
    assert dup["duplicate_id"] == created["id"]


@pytest.mark.anyio
async def test_search_places_without_key_errors_cleanly(client):
    auth = _auth(client)
    from app.mcp_tools_pois import _search_places
    with pytest.raises(ValueError) as e:
        await _search_places(auth, "blue bottle")
    assert "Google API key not configured" in str(e.value)
