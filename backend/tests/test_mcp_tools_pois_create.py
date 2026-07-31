import pytest

from app import db
from app.apitokens import generate_api_token
from app.models import ApiToken, User
from app.schemas import POIDraft
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


def _stub_enrich(monkeypatch, draft: POIDraft):
    """Replace the enrich service the /api/enrich route calls."""
    async def fake_enrich(url, session, client=None):
        return draft.model_copy(update={"source_url": url})

    monkeypatch.setattr("app.routers.enrich.enrich", fake_enrich)


@pytest.mark.anyio
async def test_create_poi_enriches_from_a_source_url_alone(client, monkeypatch):
    auth = _auth(client)
    _stub_enrich(monkeypatch, POIDraft(
        name="Cafe Modern", lat=52.37, lng=4.89, address="1 Main St",
        description="Nice spot", phone="+31201234567",
        field_sources={"name": "gmaps_url"},
    ))
    from app.mcp_tools_pois import _create_poi_enriched

    poi = await _create_poi_enriched(auth, {"source_url": "https://maps.app.goo.gl/x", "tags": []})

    assert poi["name"] == "Cafe Modern"
    assert poi["lat"] == 52.37 and poi["lng"] == 4.89
    assert poi["address"] == "1 Main St"
    assert poi["notes"] == "Nice spot"   # draft.description maps to notes


@pytest.mark.anyio
async def test_caller_supplied_values_beat_the_draft(client, monkeypatch):
    auth = _auth(client)
    _stub_enrich(monkeypatch, POIDraft(name="Draft Name", lat=52.37, lng=4.89, field_sources={}))
    from app.mcp_tools_pois import _create_poi_enriched

    poi = await _create_poi_enriched(auth, {
        "name": "My Name", "source_url": "https://maps.app.goo.gl/x", "tags": [],
    })

    assert poi["name"] == "My Name"          # caller wins
    assert poi["lat"] == 52.37               # gap still filled from the draft


@pytest.mark.anyio
async def test_no_source_url_never_enriches(client, monkeypatch):
    auth = _auth(client)
    calls = []

    async def spy(url, session, client=None):
        calls.append(url)
        raise AssertionError("enrichment must not run without a source_url")

    monkeypatch.setattr("app.routers.enrich.enrich", spy)
    from app.mcp_tools_pois import _create_poi_enriched

    poi = await _create_poi_enriched(auth, {"name": "Museum", "lat": 52.37, "lng": 4.89, "tags": []})

    assert poi["name"] == "Museum"
    assert calls == []


@pytest.mark.anyio
async def test_a_complete_field_set_skips_the_fetch(client, monkeypatch):
    # Every enrichable field supplied, so there is no gap worth an outbound request.
    auth = _auth(client)
    calls = []

    async def spy(url, session, client=None):
        calls.append(url)
        raise AssertionError("nothing to enrich")

    monkeypatch.setattr("app.routers.enrich.enrich", spy)
    from app.mcp_tools_pois import _create_poi_enriched

    await _create_poi_enriched(auth, {
        "name": "Full", "lat": 1.0, "lng": 2.0, "address": "a", "city": "c",
        "country_code": "NL", "image_url": "https://i.example/x.jpg", "phone": "+31201234567",
        "website": "https://w.example", "notes": "n",
        "source_url": "https://maps.app.goo.gl/x", "tags": [],
    })

    assert calls == []


@pytest.mark.anyio
async def test_a_draft_without_coordinates_errors_and_creates_nothing(client, monkeypatch):
    auth = _auth(client)
    _stub_enrich(monkeypatch, POIDraft(name="Only A Name", field_sources={}))
    from app.mcp_tools_pois import _create_poi_enriched

    with pytest.raises(ValueError) as e:
        await _create_poi_enriched(auth, {"source_url": "https://x.example/p", "tags": []})

    assert "lat" in str(e.value) and "lng" in str(e.value)
    assert client.get("/api/pois", headers={"Authorization": auth}).json() == []


@pytest.mark.anyio
async def test_enrichment_failure_propagates_and_creates_nothing(client, monkeypatch):
    auth = _auth(client)

    async def boom(url, session, client=None):
        from fastapi import HTTPException
        raise HTTPException(status_code=502, detail="Could not fetch the page")

    monkeypatch.setattr("app.routers.enrich.enrich", boom)
    from app.mcp_tools_pois import _create_poi_enriched

    with pytest.raises(ValueError) as e:
        await _create_poi_enriched(auth, {"source_url": "https://x.example/p", "tags": []})

    assert "502" in str(e.value)
    assert client.get("/api/pois", headers={"Authorization": auth}).json() == []


@pytest.mark.anyio
async def test_missing_required_fields_without_a_url_names_them(client):
    auth = _auth(client)
    from app.mcp_tools_pois import _create_poi_enriched

    with pytest.raises(ValueError) as e:
        await _create_poi_enriched(auth, {"name": "Nameless Coords", "tags": []})

    assert "lat" in str(e.value) and "lng" in str(e.value)
    assert "source_url" in str(e.value)   # tells the caller how to fill them
