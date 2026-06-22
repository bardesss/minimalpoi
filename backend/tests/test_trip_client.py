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
async def test_persistent_401_raises():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/auth/login":
            return httpx.Response(200, json={"access_token": "tok", "refresh_token": "r"})
        return httpx.Response(401)  # token never accepted
    http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    tc = TripClient("https://trip.lan", "me", "pw", http)
    with pytest.raises(TripError):
        await tc._request("GET", "/api/places")
    await http.aclose()


@pytest.mark.anyio
async def test_bad_credentials_raise():
    http = httpx.AsyncClient(transport=httpx.MockTransport(
        lambda r: httpx.Response(401, json={"detail": "bad"})))
    tc = TripClient("https://trip.lan", "me", "pw", http)
    with pytest.raises(TripError):
        await tc._request("GET", "/api/places")
    await http.aclose()


def _crud_server():
    places = {1: {"id": 1, "name": "A", "lat": 1.0, "lng": 2.0, "place": "x",
                  "category": {"id": 9, "name": "Food", "color": "#fff"}, "links": [], "image": None}}

    def handler(request: httpx.Request) -> httpx.Response:
        p = request.url.path
        if p == "/api/auth/login":
            return httpx.Response(200, json={"access_token": "good", "refresh_token": "r"})
        if request.headers.get("authorization") != "Bearer good":
            return httpx.Response(401)
        if p == "/api/places" and request.method == "GET":
            return httpx.Response(200, json=list(places.values()))
        if p == "/api/places" and request.method == "POST":
            import json as _j
            body = _j.loads(request.content)
            new = {"id": 2, **body, "category": {"id": 9, "name": "Food", "color": "#fff"}}
            places[2] = new
            return httpx.Response(200, json=new)
        if p == "/api/places/1" and request.method == "PUT":
            import json as _j
            places[1].update(_j.loads(request.content))
            return httpx.Response(200, json=places[1])
        if p == "/api/places/1" and request.method == "DELETE":
            places.pop(1, None)
            return httpx.Response(200, json={"ok": True})
        return httpx.Response(404)

    return handler


@pytest.mark.anyio
async def test_place_crud_methods():
    http = httpx.AsyncClient(transport=httpx.MockTransport(_crud_server()))
    tc = TripClient("https://trip.lan", "me", "pw", http)
    assert len(await tc.list_places()) == 1
    created = await tc.create_place({"name": "B", "lat": 3.0, "lng": 4.0, "place": "y", "category_id": 9})
    assert created["id"] == 2
    updated = await tc.update_place(1, {"name": "A2"})
    assert updated["name"] == "A2"
    await tc.delete_place(1)
    await http.aclose()
