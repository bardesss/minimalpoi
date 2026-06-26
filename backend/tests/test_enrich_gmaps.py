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


def test_unwrap_consent_recovers_maps_url():
    consent = (
        "https://consent.google.com/ml?continue="
        "https://www.google.com/maps/place/TACO%2BLINDO%2BWest/@52.38,4.85,3z&gl=NL"
    )
    assert gmaps.unwrap_consent(consent) == "https://www.google.com/maps/place/TACO+LINDO+West/@52.38,4.85,3z"
    # Non-consent URLs pass through untouched.
    assert gmaps.unwrap_consent("https://www.google.com/maps/place/X") == "https://www.google.com/maps/place/X"


def test_extract_place_name_consent_double_encoded():
    # Name encoded by Maps as "TACO+LINDO+West", then percent-encoded for the
    # consent `continue=` param so each "+" arrives as "%2B".
    url = "https://www.google.com/maps/place/TACO%2BLINDO%2BWest/@52.38,4.85,3z"
    assert gmaps.extract_place_name(url) == "TACO LINDO West"


@pytest.mark.anyio
async def test_resolve_shortlink_unwraps_consent_gate():
    def handler(request: httpx.Request) -> httpx.Response:
        if "maps.app.goo.gl" in str(request.url):
            return httpx.Response(307, headers={"location": (
                "https://consent.google.com/ml?continue="
                "https://www.google.com/maps/place/TACO%2BLINDO%2BWest/@52.38,4.85,3z"
            )})
        return httpx.Response(200, request=request)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler), follow_redirects=False)
    resolved = await gmaps.resolve_shortlink("https://maps.app.goo.gl/abc", client=client)
    await client.aclose()
    assert resolved == "https://www.google.com/maps/place/TACO+LINDO+West/@52.38,4.85,3z"
    assert gmaps.extract_place_name(resolved) == "TACO LINDO West"


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
                "place_id": "PID123",
                "geometry": {"location": {"lat": 52.3676, "lng": 4.9041}},
            }],
            "status": "OK",
        })

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    out = await gmaps.places_lookup("Cafe Modern", api_key="k", client=client)
    await client.aclose()
    assert out == {
        "name": "Café Modern", "address": "Street 12, Amsterdam",
        "place_id": "PID123", "lat": 52.3676, "lng": 4.9041,
    }


@pytest.mark.anyio
async def test_place_search_returns_candidates():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={
            "results": [
                {"name": "Taco Lindo", "formatted_address": "A St 1, Amsterdam, Netherlands",
                 "place_id": "PID1", "geometry": {"location": {"lat": 52.1, "lng": 4.2}}},
                {"name": "Taco Lindo West", "formatted_address": "B St 2, Haarlem", "place_id": "PID2"},
                {"name": "no place_id"},  # skipped — no place_id
            ],
            "status": "OK",
        })

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    out = await gmaps.place_search("taco lindo", api_key="k", client=client)
    await client.aclose()
    assert out == [
        {"place_id": "PID1", "name": "Taco Lindo", "address": "A St 1, Amsterdam, Netherlands", "lat": 52.1, "lng": 4.2},
        {"place_id": "PID2", "name": "Taco Lindo West", "address": "B St 2, Haarlem"},
    ]


@pytest.mark.anyio
async def test_place_search_empty_on_error():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    out = await gmaps.place_search("x", api_key="k", client=client)
    await client.aclose()
    assert out == []


@pytest.mark.anyio
async def test_place_by_id_returns_full_draft_fields():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={
            "result": {
                "name": "Taco Lindo West",
                "formatted_address": "B St 2, 2011 AB Haarlem, Netherlands",
                "geometry": {"location": {"lat": 52.38, "lng": 4.85}},
                "international_phone_number": "+31 23 555 0000",
                "website": "https://taco.example",
                "photos": [{"photo_reference": "REF"}],
                "address_components": [
                    {"long_name": "Haarlem", "short_name": "Haarlem", "types": ["locality"]},
                    {"long_name": "Netherlands", "short_name": "NL", "types": ["country"]},
                ],
            },
            "status": "OK",
        })

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    out = await gmaps.place_by_id("PID2", api_key="k", client=client)
    await client.aclose()
    assert out == {
        "name": "Taco Lindo West",
        "address": "B St 2, 2011 AB Haarlem, Netherlands",
        "lat": 52.38, "lng": 4.85,
        "phone": "+31 23 555 0000",
        "website": "https://taco.example",
        "photo_reference": "REF",
        "city": "Haarlem",
        "country_code": "NL",
    }


@pytest.mark.anyio
async def test_place_details_parses_phone_website_photo():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={
            "result": {
                "international_phone_number": "+31 20 308 0090",
                "formatted_phone_number": "020 308 0090",
                "website": "https://cafe.example",
                "photos": [{"photo_reference": "PHOTOREF"}],
                "address_components": [
                    {"long_name": "Amsterdam", "short_name": "Amsterdam", "types": ["locality", "political"]},
                    {"long_name": "Netherlands", "short_name": "NL", "types": ["country", "political"]},
                ],
            },
            "status": "OK",
        })

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    out = await gmaps.place_details("PID123", api_key="k", client=client)
    await client.aclose()
    # Prefers the international (E.164-ish) form so it normalizes cleanly.
    assert out == {
        "phone": "+31 20 308 0090",
        "website": "https://cafe.example",
        "photo_reference": "PHOTOREF",
        "city": "Amsterdam",
        "country_code": "NL",
    }


def test_city_country_prefers_locality_and_iso_code():
    components = [
        {"long_name": "1234 AB", "short_name": "1234 AB", "types": ["postal_code"]},
        {"long_name": "Haarlem", "short_name": "Haarlem", "types": ["locality", "political"]},
        {"long_name": "Noord-Holland", "short_name": "NH", "types": ["administrative_area_level_1"]},
        {"long_name": "Netherlands", "short_name": "NL", "types": ["country", "political"]},
    ]
    assert gmaps._city_country(components) == ("Haarlem", "NL")
    # Falls back to postal_town when there's no locality (common in the UK).
    uk = [
        {"long_name": "London", "short_name": "London", "types": ["postal_town"]},
        {"long_name": "United Kingdom", "short_name": "GB", "types": ["country", "political"]},
    ]
    assert gmaps._city_country(uk) == ("London", "GB")


@pytest.mark.anyio
async def test_resolve_photo_url_reads_redirect_without_following():
    def handler(request: httpx.Request) -> httpx.Response:
        # The key must be sent to Google but never appear in the returned URL.
        assert "key=k" in str(request.url)
        return httpx.Response(302, headers={"location": "https://lh3.googleusercontent.com/p/AF1"})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler), follow_redirects=True)
    out = await gmaps.resolve_photo_url("PHOTOREF", api_key="k", client=client)
    await client.aclose()
    assert out == "https://lh3.googleusercontent.com/p/AF1"
