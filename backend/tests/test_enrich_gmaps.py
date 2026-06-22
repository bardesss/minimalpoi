import httpx
import pytest

from app.enrich import gmaps


@pytest.fixture
def anyio_backend():
    return "asyncio"


def test_detection():
    assert gmaps.is_google_maps("https://www.google.com/maps/place/Cafe/@52.36,4.90,17z")
    assert gmaps.is_google_maps("https://maps.app.goo.gl/abc")
    assert not gmaps.is_google_maps("https://tripadvisor.com/x")
    assert gmaps.is_shortlink("https://maps.app.goo.gl/abc")
    assert not gmaps.is_shortlink("https://www.google.com/maps/place/X")


def test_extract_coords_at_pattern():
    assert gmaps.extract_coords("https://www.google.com/maps/place/X/@52.3676,4.9041,17z") == (52.3676, 4.9041)


def test_extract_coords_3d4d_pattern():
    url = "https://www.google.com/maps/place/X/data=!3d52.3676!4d4.9041"
    assert gmaps.extract_coords(url) == (52.3676, 4.9041)


def test_extract_coords_none():
    assert gmaps.extract_coords("https://www.google.com/maps/place/X") is None


def test_extract_place_name():
    assert gmaps.extract_place_name("https://www.google.com/maps/place/Caf%C3%A9+Modern/@52,4") == "Café Modern"


def test_extract_place_name_strips_query():
    assert gmaps.extract_place_name("https://www.google.com/maps/place/Caf%C3%A9+Modern?hl=en") == "Café Modern"


@pytest.mark.anyio
async def test_resolve_shortlink_follows_redirect():
    def handler(request: httpx.Request) -> httpx.Response:
        if "maps.app.goo.gl" in str(request.url):
            return httpx.Response(307, headers={"location": "https://www.google.com/maps/place/X/@1.0,2.0,17z"})
        else:
            return httpx.Response(200, request=request)

    client = httpx.AsyncClient(
        transport=httpx.MockTransport(handler),
        follow_redirects=False,
    )
    resolved = await gmaps.resolve_shortlink("https://maps.app.goo.gl/abc", client=client)
    await client.aclose()
    assert resolved == "https://www.google.com/maps/place/X/@1.0,2.0,17z"


def test_extract_coords_prefers_3d4d_over_at():
    url = "https://www.google.com/maps/place/X/@52.0,4.0,17z/data=!3d52.3676!4d4.9041"
    assert gmaps.extract_coords(url) == (52.3676, 4.9041)


def test_is_google_maps_rejects_crafted_url():
    assert gmaps.is_google_maps("https://evil.example/?x=google.com/maps") is False


@pytest.mark.anyio
async def test_places_lookup_parses_first_result():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={
            "results": [{
                "name": "Café Modern",
                "formatted_address": "Street 12, Amsterdam",
                "geometry": {"location": {"lat": 52.3676, "lng": 4.9041}},
            }],
            "status": "OK",
        })

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    out = await gmaps.places_lookup("Cafe Modern", api_key="k", client=client)
    await client.aclose()
    assert out == {"name": "Café Modern", "address": "Street 12, Amsterdam", "lat": 52.3676, "lng": 4.9041}
