import pytest
from starlette.testclient import TestClient

from app.main import app


def _setup(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    client.patch("/api/settings", json={"routes_enabled": True})


def _route_with_node(client):
    rid = client.post("/api/routes", json={"name": "NL", "start_date": "2026-07-14"}).json()["id"]
    client.post(f"/api/routes/{rid}/nodes", json={"kind": "stop", "name": "A", "lat": 1.0, "lng": 2.0})
    return rid


def _anon(client):
    return TestClient(client.app)  # no auth cookie


def test_public_get_returns_stripped_route(client):
    _setup(client); rid = _route_with_node(client)
    tok = client.put(f"/api/routes/{rid}/share", json={}).json()["token"]
    r = _anon(client).get(f"/api/public/routes/{tok}")
    assert r.status_code == 200
    body = r.json()
    assert body["locked"] is False
    route = body["route"]
    assert route["name"] == "NL" and len(route["nodes"]) == 1
    assert "attachments" not in route and "owner_username" not in route and "team_id" not in route
    assert route["map"]["map_tile_url"]  # embedded map settings present
    assert r.headers.get("X-Robots-Tag") == "noindex"


def test_unknown_and_expired_are_404(client):
    _setup(client); rid = _route_with_node(client)
    assert _anon(client).get("/api/public/routes/nope").status_code == 404
    client.put(f"/api/routes/{rid}/share", json={"expires_at": "2000-01-01T00:00:00"})
    tok = client.get(f"/api/routes/{rid}").json()["share"]["token"]
    assert _anon(client).get(f"/api/public/routes/{tok}").status_code == 404


def test_password_lock_then_unlock(client):
    _setup(client); rid = _route_with_node(client)
    tok = client.put(f"/api/routes/{rid}/share", json={"password": "hunter22"}).json()["token"]
    anon = _anon(client)
    assert anon.get(f"/api/public/routes/{tok}").json() == {"locked": True, "route": None}
    assert anon.post(f"/api/public/routes/{tok}/unlock", json={"password": "wrong"}).status_code == 401
    ok = anon.post(f"/api/public/routes/{tok}/unlock", json={"password": "hunter22"})
    assert ok.status_code == 200 and ok.json()["route"]["name"] == "NL"
    # grant cookie now lets GET through without re-prompting
    assert anon.get(f"/api/public/routes/{tok}").json()["locked"] is False


def test_password_change_invalidates_existing_grant(client):
    # A viewer who already unlocked must be re-locked out once the owner
    # changes the share's password — the old grant cookie is bound to the
    # password version it was issued under, not just the token.
    _setup(client); rid = _route_with_node(client)
    tok = client.put(f"/api/routes/{rid}/share", json={"password": "hunter22"}).json()["token"]
    anon = _anon(client)
    ok = anon.post(f"/api/public/routes/{tok}/unlock", json={"password": "hunter22"})
    assert ok.status_code == 200
    assert anon.get(f"/api/public/routes/{tok}").json()["locked"] is False

    # Owner rotates the password (token stays the same).
    r = client.put(f"/api/routes/{rid}/share", json={"password": "different8"})
    assert r.status_code == 200 and r.json()["token"] == tok

    # The stale grant cookie from before the change must not unlock anymore.
    assert anon.get(f"/api/public/routes/{tok}").json() == {"locked": True, "route": None}


@pytest.fixture
def rl_client(client):
    # The shared `client` fixture disables the limiter; re-enable it here so
    # the rate-limit assertion below is deterministic, then restore afterward
    # so other tests in the module aren't affected.
    app.state.limiter.reset()
    app.state.limiter.enabled = True
    yield client
    app.state.limiter.enabled = False
    app.state.limiter.reset()


def test_unlock_is_rate_limited_more_strictly_than_the_page_load(rl_client):
    # unlock is brute-forceable (password guessing) so it shares LOGIN_LIMIT
    # (5/minute) rather than the page-load GET's more permissive PUBLIC_LIMIT.
    _setup(rl_client); rid = _route_with_node(rl_client)
    tok = rl_client.put(f"/api/routes/{rid}/share", json={"password": "hunter22"}).json()["token"]
    anon = _anon(rl_client)
    app.state.limiter.reset()  # setup/route/share calls above shouldn't count
    for _ in range(5):
        r = anon.post(f"/api/public/routes/{tok}/unlock", json={"password": "wrong"})
        assert r.status_code == 401
    blocked = anon.post(f"/api/public/routes/{tok}/unlock", json={"password": "wrong"})
    assert blocked.status_code == 429
