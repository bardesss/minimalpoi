from app.schemas import POIDraft


def _login_admin(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})


def test_places_search_requires_auth(client):
    assert client.get("/api/places/search", params={"q": "taco"}).status_code == 401


def test_places_search_needs_google_key(client):
    _login_admin(client)
    # No key configured yet → 400 with a helpful detail.
    resp = client.get("/api/places/search", params={"q": "taco"})
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
    assert resp.json() == [{"place_id": "PID1", "name": "Taco Lindo", "address": "A St, Amsterdam", "lat": None, "lng": None}]


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
