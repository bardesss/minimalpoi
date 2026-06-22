import httpx
import pytest

from app.trip.client import TripClient, TripError


@pytest.fixture
def anyio_backend():
    return "asyncio"


def _server():
    """In-memory TRIP auth server: token 'good' after login; 401 otherwise."""
    state = {"logins": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/auth/login":
            state["logins"] += 1
            return httpx.Response(200, json={"access_token": "good", "refresh_token": "r"})
        auth = request.headers.get("authorization")
        if auth != "Bearer good":
            return httpx.Response(401, json={"detail": "nope"})
        return httpx.Response(200, json={"ok": True, "path": request.url.path})

    return handler, state


@pytest.mark.anyio
async def test_logs_in_then_authorizes():
    handler, state = _server()
    http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    tc = TripClient("https://trip.lan", "me", "pw", http)
    resp = await tc._request("GET", "/api/places")
    await http.aclose()
    assert resp.json()["ok"] is True
    assert state["logins"] == 1  # logged in once, lazily


@pytest.mark.anyio
async def test_relogin_on_401():
    # First token is stale; server only accepts 'good'. Simulate by handing a bad token first.
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/auth/login":
            return httpx.Response(200, json={"access_token": "good", "refresh_token": "r"})
        # Accept only 'good'; the client must re-login to get it.
        if request.headers.get("authorization") == "Bearer good":
            return httpx.Response(200, json={"ok": True})
        return httpx.Response(401)

    http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    tc = TripClient("https://trip.lan", "me", "pw", http)
    tc._access = "stale"  # pretend we hold an expired token
    resp = await tc._request("GET", "/api/places")
    await http.aclose()
    assert resp.json()["ok"] is True


@pytest.mark.anyio
async def test_bad_credentials_raise():
    http = httpx.AsyncClient(transport=httpx.MockTransport(
        lambda r: httpx.Response(401, json={"detail": "bad"})))
    tc = TripClient("https://trip.lan", "me", "pw", http)
    with pytest.raises(TripError):
        await tc._request("GET", "/api/places")
    await http.aclose()
