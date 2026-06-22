from app.schemas import POIDraft


def test_enrich_endpoint_requires_auth(client):
    assert client.post("/api/enrich", json={"url": "https://x.example"}).status_code == 401


def test_enrich_endpoint_returns_draft(client, monkeypatch):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})

    async def fake_enrich(url, session, client=None):
        return POIDraft(name="Stub", lat=1.0, lng=2.0, source_url=url, field_sources={"lat": "gmaps_url"})

    monkeypatch.setattr("app.routers.enrich.enrich", fake_enrich)
    resp = client.post("/api/enrich", json={"url": "https://x.example/p"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Stub"
    assert body["source_url"] == "https://x.example/p"
    assert body["field_sources"]["lat"] == "gmaps_url"
