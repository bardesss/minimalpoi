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


@pytest.mark.anyio
async def test_private_nominatim_allowed_when_flag_set(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=[{"lat": "1.5", "lon": "2.5"}])

    async def resolve(host):
        return ["10.0.0.5"]
    monkeypatch.setattr("app.enrich.safety._resolve_ips", resolve)
    base = "http://nominatim.lan:8080"
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    monkeypatch.delenv("NOMINATIM_ALLOW_PRIVATE", raising=False)
    assert await nominatim_geocode("x", base, client=client) is None
    monkeypatch.setenv("NOMINATIM_ALLOW_PRIVATE", "1")
    assert await nominatim_geocode("x", base, client=client) == (1.5, 2.5)
    await client.aclose()


@pytest.mark.anyio
async def test_private_nominatim_still_capped_and_deadlined(monkeypatch):
    import asyncio
    import time

    from app.enrich import safety

    async def resolve(host):
        return ["10.0.0.5"]
    monkeypatch.setattr(safety, "_resolve_ips", resolve)
    monkeypatch.setenv("NOMINATIM_ALLOW_PRIVATE", "1")
    base = "http://nominatim.lan:8080"
    seen: list[httpx.Request] = []

    def big(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, content=b"x" * (safety.MAX_RESPONSE_BYTES + 1))
    client = httpx.AsyncClient(transport=httpx.MockTransport(big))
    assert await nominatim_geocode("x", base, client=client) is None
    await client.aclose()
    # The private path goes through safe_get: pinned to the validated IP.
    assert seen[0].url.host == "10.0.0.5" and seen[0].headers["host"] == "nominatim.lan:8080"

    class Drip(httpx.AsyncByteStream):
        async def __aiter__(self):
            for _ in range(30):
                await asyncio.sleep(1)
                yield b"x"
    monkeypatch.setattr(safety, "FETCH_DEADLINE_S", 0.3)
    client = httpx.AsyncClient(transport=httpx.MockTransport(lambda r: httpx.Response(200, stream=Drip())))
    start = time.monotonic()
    assert await nominatim_geocode("x", base, client=client) is None
    assert time.monotonic() - start < 2
    await client.aclose()
