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


def test_limiter_is_disabled_for_the_general_suite(client):
    # Sanity: with the default fixture, many logins never trip a 429.
    for _ in range(8):
        r = client.post("/api/auth/login", json={"username": "nope", "password": "bad"})
        assert r.status_code == 401
