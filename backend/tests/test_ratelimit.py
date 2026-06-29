"""Rate limiting (slowapi). The shared `client` fixture disables the limiter; we
re-enable + reset it here so these assertions are deterministic."""
import pytest

from app.main import app


@pytest.fixture
def rl_client(client):
    app.state.limiter.reset()
    app.state.limiter.enabled = True
    yield client
    app.state.limiter.enabled = False
    app.state.limiter.reset()


def test_login_is_rate_limited_after_five_attempts(rl_client):
    # LOGIN_LIMIT is 5/minute — the first five bad logins return 401, the sixth 429.
    for _ in range(5):
        r = rl_client.post("/api/auth/login", json={"username": "nope", "password": "bad"})
        assert r.status_code == 401
    blocked = rl_client.post("/api/auth/login", json={"username": "nope", "password": "bad"})
    assert blocked.status_code == 429


def test_login_does_not_leak_user_existence_via_status(rl_client):
    # A missing user and a wrong password are both plain 401 (timing is equalized
    # in the handler; here we assert the status is indistinguishable).
    rl_client.post("/api/auth/setup", json={"username": "admin", "password": "correct-horse"})
    app.state.limiter.reset()
    missing = rl_client.post("/api/auth/login", json={"username": "ghost", "password": "x"})
    wrong = rl_client.post("/api/auth/login", json={"username": "admin", "password": "x"})
    assert missing.status_code == 401
    assert wrong.status_code == 401
    assert missing.json() == wrong.json()


def test_limited_endpoint_without_response_param_does_not_500(rl_client):
    # Regression: with the limiter ENABLED, a rate-limited endpoint that does not
    # declare a `response: Response` param must still succeed. headers_enabled on
    # the Limiter made slowapi require such a param to inject X-RateLimit headers,
    # 500'ing every write/search endpoint in production (login only worked because
    # it happens to take a response for the cookie). The general suite missed it
    # because it disables the limiter.
    rl_client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    r = rl_client.post("/api/pois", json={"name": "X", "lat": 1.0, "lng": 2.0})
    assert r.status_code == 201, r.text


def test_limiter_is_disabled_for_the_general_suite(client):
    # Sanity: with the default fixture, many logins never trip a 429.
    for _ in range(8):
        r = client.post("/api/auth/login", json={"username": "nope", "password": "bad"})
        assert r.status_code == 401
