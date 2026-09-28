from sqlmodel import Session

from app.schemas import POIDraft


def _login_admin(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})


def _corrupt_google_key(client):
    """Store a Google key that can't be decrypted (e.g. the secret key
    changed since it was written), the way test_correctness.py does."""
    from app import db
    from app.models import get_or_create_settings

    with Session(db.engine) as s:
        settings = get_or_create_settings(s)
        settings.google_api_key_enc = "garbage-not-fernet"
        s.add(settings)
        s.commit()


def test_places_search_requires_auth(client):
    assert client.get("/api/places/search", params={"q": "taco"}).status_code == 401


def test_places_search_falls_back_to_nominatim_without_a_key(client, monkeypatch):
    _login_admin(client)

    async def fake_search(query, base_url, client=None, limit=8):
        assert query == "taco"
        return [{"place_id": "osm:N1", "name": "Taco", "address": "A St", "lat": 52.0, "lng": 4.0, "source": "osm"}]

    monkeypatch.setattr("app.routers.places.nominatim_search", fake_search)
    resp = client.get("/api/places/search", params={"q": "taco"})
    assert resp.status_code == 200
    assert resp.json() == [{"place_id": "osm:N1", "name": "Taco", "address": "A St", "lat": 52.0, "lng": 4.0, "source": "osm"}]


def test_places_osm_draft_needs_no_key(client, monkeypatch):
    _login_admin(client)

    async def fake_lookup(osm_id, base_url, client=None):
        assert osm_id == "N1"
        return POIDraft(name="Taco", lat=52.0, lng=4.0, field_sources={"name": "osm"})

    monkeypatch.setattr("app.routers.places.nominatim_lookup", fake_lookup)
    resp = client.get("/api/places/osm:N1")
    assert resp.status_code == 200 and resp.json()["name"] == "Taco"


def test_places_osm_draft_rejects_malformed_ids(client):
    _login_admin(client)
    assert client.get("/api/places/osm:X1").status_code == 422
    assert client.get("/api/places/osm:N").status_code == 422
    # Trailing newline (URL-encoded so it survives as part of the path) must be
    # rejected too — .fullmatch (not .match) plus re.ASCII closes this off.
    assert client.get("/api/places/osm:N1%0A").status_code == 422


def test_places_osm_draft_404_when_not_found(client, monkeypatch):
    _login_admin(client)

    async def fake_lookup(osm_id, base_url, client=None):
        return None

    monkeypatch.setattr("app.routers.places.nominatim_lookup", fake_lookup)
    assert client.get("/api/places/osm:N999").status_code == 404


def test_places_google_draft_still_needs_key(client):
    _login_admin(client)
    resp = client.get("/api/places/PID1")
    assert resp.status_code == 400
    assert "Google API key" in resp.json()["detail"]


def test_places_search_returns_candidates(client, monkeypatch):
    _login_admin(client)
    client.patch("/api/settings", json={"google_api_key": "test-key"})

    async def fake_search(query, api_key, client=None, limit=6):
        assert query == "taco" and api_key == "test-key"
        return [{"place_id": "PID1", "name": "Taco Lindo", "address": "A St, Amsterdam"}]

    monkeypatch.setattr("app.routers.places.gmaps.place_search", fake_search)
    resp = client.get("/api/places/search", params={"q": "taco"})
    assert resp.status_code == 200
    assert resp.json() == [{"place_id": "PID1", "name": "Taco Lindo", "address": "A St, Amsterdam", "lat": None, "lng": None, "source": "google"}]


def test_places_search_returns_400_with_detail_when_key_cannot_be_decrypted(client, monkeypatch):
    _login_admin(client)
    _corrupt_google_key(client)

    async def fake_search(query, base_url, client=None, limit=8):
        raise AssertionError("must not fall back to Nominatim over the network")

    monkeypatch.setattr("app.routers.places.nominatim_search", fake_search)
    resp = client.get("/api/places/search", params={"q": "taco"})
    assert resp.status_code == 400
    assert "can't be decrypted" in resp.json()["detail"]


def test_places_google_draft_returns_400_with_detail_when_key_cannot_be_decrypted(client, monkeypatch):
    _login_admin(client)
    _corrupt_google_key(client)

    async def fake_lookup(osm_id, base_url, client=None):
        raise AssertionError("must not fall back to Nominatim over the network")

    monkeypatch.setattr("app.routers.places.nominatim_lookup", fake_lookup)
    resp = client.get("/api/places/PID1")
    assert resp.status_code == 400
    assert "can't be decrypted" in resp.json()["detail"]


def test_places_draft_returns_poidraft(client, monkeypatch):
    _login_admin(client)
    client.patch("/api/settings", json={"google_api_key": "test-key"})

    async def fake_enrich_place(place_id, session, client=None):
        assert place_id == "PID1"
        return POIDraft(name="Taco Lindo West", lat=52.38, lng=4.85, city="Haarlem", country_code="NL", field_sources={"name": "places"})

    monkeypatch.setattr("app.routers.places.enrich_place", fake_enrich_place)
    resp = client.get("/api/places/PID1")
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Taco Lindo West"
    assert body["country_code"] == "NL"
    assert body["field_sources"]["name"] == "places"
