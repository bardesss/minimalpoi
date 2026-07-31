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


def _request(headers=None, cookies=None, client=("10.0.0.1", 1234)):
    """A minimal Starlette Request for exercising the key function directly."""
    from starlette.requests import Request

    raw = [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()]
    if cookies:
        raw.append((b"cookie", "; ".join(f"{k}={v}" for k, v in cookies.items()).encode()))
    return Request({
        "type": "http", "method": "GET", "path": "/", "query_string": b"",
        "headers": raw, "client": client, "scheme": "http", "server": ("test", 80),
    })


def test_distinct_bearer_tokens_get_distinct_buckets():
    # Regression: MCP calls reach the app through httpx.ASGITransport, which stamps
    # every in-process request with the same synthetic client address. Keying on the
    # cookie alone collapsed every MCP caller into one shared bucket.
    from app.apitokens import generate_api_token, hash_api_token
    from app.ratelimit import user_or_ip

    a, _, _ = generate_api_token()
    b, _, _ = generate_api_token()
    key_a = user_or_ip(_request(headers={"authorization": f"Bearer {a}"}))
    key_b = user_or_ip(_request(headers={"authorization": f"Bearer {b}"}))

    assert key_a != key_b
    assert key_a == f"token:{hash_api_token(a)}"


def test_bearer_key_does_not_contain_the_raw_token():
    # The key lands in the limiter's in-memory store; the secret must not.
    from app.apitokens import generate_api_token
    from app.ratelimit import user_or_ip

    full, _, _ = generate_api_token()
    assert full not in user_or_ip(_request(headers={"authorization": f"Bearer {full}"}))


def test_bearer_takes_precedence_over_a_cookie():
    # Matches get_current_user's precedence (deps.py): a present bearer wins.
    from app.apitokens import generate_api_token, hash_api_token
    from app.ratelimit import user_or_ip

    full, _, _ = generate_api_token()
    key = user_or_ip(_request(
        headers={"authorization": f"Bearer {full}"}, cookies={"access_token": "irrelevant"}
    ))
    assert key == f"token:{hash_api_token(full)}"


def test_anonymous_requests_are_still_keyed_by_ip():
    from app.ratelimit import user_or_ip

    assert user_or_ip(_request(client=("203.0.113.9", 5))) == "203.0.113.9"


def test_cookie_sessions_are_still_keyed_by_username(data_dir):
    # data_dir: create_access_token reads the secret key from the data directory.
    from app.ratelimit import user_or_ip
    from app.security import create_access_token

    token = create_access_token("alice", 0)
    assert user_or_ip(_request(cookies={"access_token": token})) == "user:alice"
