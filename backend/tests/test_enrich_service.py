from pathlib import Path

import httpx
import pytest

from app import db
from app.enrich.service import enrich
from app.models import get_or_create_settings
from sqlmodel import Session

FIX = Path(__file__).parent / "fixtures"


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_enrich_generic_website(client):
    # `client` fixture initializes the temp DB/engine.
    html = (FIX / "tripadvisor_restaurant.html").read_text(encoding="utf-8")
    transport = httpx.MockTransport(lambda r: httpx.Response(200, text=html, headers={"content-type": "text/html"}))
    http = httpx.AsyncClient(transport=transport)
    with Session(db.engine) as session:
        draft = await enrich("https://tripadvisor.example/r/cafe", session, client=http)
    await http.aclose()
    assert draft.name == "Café Modern"
    assert draft.lat == 52.3676 and draft.lng == 4.9041
    assert draft.image_url == "https://img.example/cafe.jpg"
    assert draft.phone == "+31 20 000 0000"
    assert draft.source_url == "https://tripadvisor.example/r/cafe"
    assert draft.field_sources["lat"] == "jsonld"


@pytest.mark.anyio
async def test_enrich_gmaps_url_coords_without_key(client):
    # No Google key configured -> coords come from the URL, name from the path.
    http = httpx.AsyncClient(transport=httpx.MockTransport(lambda r: httpx.Response(200, text="<html></html>", headers={"content-type": "text/html"})))
    url = "https://www.google.com/maps/place/Caf%C3%A9+Modern/@52.3676,4.9041,17z"
    with Session(db.engine) as session:
        draft = await enrich(url, session, client=http)
    await http.aclose()
    assert draft.lat == 52.3676 and draft.lng == 4.9041
    assert draft.field_sources["lat"] == "gmaps_url"
    assert draft.name == "Café Modern"


@pytest.mark.anyio
async def test_enrich_never_raises_on_dead_link(client):
    http = httpx.AsyncClient(transport=httpx.MockTransport(lambda r: (_ for _ in ()).throw(httpx.ConnectError("x"))))
    with Session(db.engine) as session:
        draft = await enrich("https://dead.example/x", session, client=http)
    await http.aclose()
    assert draft.source_url == "https://dead.example/x"
    assert draft.name is None
