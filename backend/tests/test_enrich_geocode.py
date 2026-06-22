import httpx
import pytest

from app.enrich.geocode import nominatim_geocode


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_geocode_returns_latlng():
    def handler(request: httpx.Request) -> httpx.Response:
        assert "search" in str(request.url)
        return httpx.Response(200, json=[{"lat": "52.3676", "lon": "4.9041"}])

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    out = await nominatim_geocode("Cafe Modern, Amsterdam", "https://nominatim.openstreetmap.org", client=client)
    await client.aclose()
    assert out == (52.3676, 4.9041)


@pytest.mark.anyio
async def test_geocode_empty_returns_none():
    client = httpx.AsyncClient(transport=httpx.MockTransport(lambda r: httpx.Response(200, json=[])))
    out = await nominatim_geocode("nowhere", "https://nominatim.openstreetmap.org", client=client)
    await client.aclose()
    assert out is None
