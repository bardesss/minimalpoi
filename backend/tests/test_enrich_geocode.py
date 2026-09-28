import httpx
import pytest

from app.enrich import geocode
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


@pytest.mark.anyio
async def test_nominatim_search_maps_results():
    def handler(request):
        assert request.url.path.endswith("/search")
        assert request.url.params["format"] == "jsonv2"
        assert request.url.params["addressdetails"] == "1"
        return httpx.Response(200, json=[
            {"osm_type": "node", "osm_id": 123, "lat": "52.36", "lon": "4.8852", "name": "Rijksmuseum",
             "display_name": "Rijksmuseum, Museumstraat 1, Amsterdam, Nederland",
             "address": {"city": "Amsterdam", "country_code": "nl"}},
            {"osm_type": "way", "osm_id": 45, "lat": "52.37", "lon": "4.9", "name": "",
             "display_name": "Dam, Amsterdam, Nederland", "address": {}},
        ])
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    out = await geocode.nominatim_search("rijksmuseum", "https://nominatim.example", client=client)
    assert out == [
        {"place_id": "osm:N123", "name": "Rijksmuseum", "address": "Rijksmuseum, Museumstraat 1, Amsterdam, Nederland", "lat": 52.36, "lng": 4.8852, "source": "osm"},
        {"place_id": "osm:W45", "name": "Dam", "address": "Dam, Amsterdam, Nederland", "lat": 52.37, "lng": 4.9, "source": "osm"},
    ]


@pytest.mark.anyio
async def test_nominatim_search_errors_return_empty():
    client = httpx.AsyncClient(transport=httpx.MockTransport(lambda r: httpx.Response(500)))
    assert await geocode.nominatim_search("x", "https://nominatim.example", client=client) == []


@pytest.mark.anyio
async def test_nominatim_lookup_builds_draft():
    def handler(request):
        assert request.url.path.endswith("/lookup")
        assert request.url.params["osm_ids"] == "N123"
        return httpx.Response(200, json=[{"osm_type": "node", "osm_id": 123, "lat": "52.36", "lon": "4.8852", "name": "Rijksmuseum",
            "display_name": "Rijksmuseum, Museumstraat 1, Amsterdam, Nederland", "address": {"town": "Amsterdam", "country_code": "nl"}}])
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    d = await geocode.nominatim_lookup("N123", "https://nominatim.example", client=client)
    assert d is not None
    assert (d.name, d.city, d.country_code, d.lat, d.lng) == ("Rijksmuseum", "Amsterdam", "NL", 52.36, 4.8852)
    assert d.address == "Rijksmuseum, Museumstraat 1, Amsterdam, Nederland"
    assert d.field_sources["name"] == "osm"


@pytest.mark.anyio
async def test_nominatim_lookup_empty_is_none():
    client = httpx.AsyncClient(transport=httpx.MockTransport(lambda r: httpx.Response(200, json=[])))
    assert await geocode.nominatim_lookup("N1", "https://nominatim.example", client=client) is None


@pytest.mark.anyio
async def test_nominatim_search_skips_non_dict_items():
    # A malformed upstream response (e.g. a bare string in the results list) must
    # not blow up the whole search — just skip that item.
    def handler(request):
        return httpx.Response(200, json=[
            "not-a-dict",
            {"osm_type": "node", "osm_id": 123, "lat": "52.36", "lon": "4.8852", "name": "Rijksmuseum",
             "display_name": "Rijksmuseum, Museumstraat 1, Amsterdam, Nederland", "address": {"city": "Amsterdam"}},
        ])
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    out = await geocode.nominatim_search("rijksmuseum", "https://nominatim.example", client=client)
    assert out == [
        {"place_id": "osm:N123", "name": "Rijksmuseum", "address": "Rijksmuseum, Museumstraat 1, Amsterdam, Nederland", "lat": 52.36, "lng": 4.8852, "source": "osm"},
    ]


@pytest.mark.anyio
async def test_nominatim_lookup_tolerates_malformed_address():
    # A non-dict "address" field must not raise; city just comes back None.
    def handler(request):
        return httpx.Response(200, json=[{"osm_type": "node", "osm_id": 123, "lat": "52.36", "lon": "4.8852",
            "name": "Rijksmuseum", "display_name": "Rijksmuseum, Amsterdam, Nederland", "address": "oops"}])
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    d = await geocode.nominatim_lookup("N123", "https://nominatim.example", client=client)
    assert d is not None
    assert d.name == "Rijksmuseum"
    assert d.city is None
