import queue

from app.routing.events import RouteEventHub


def test_hub_fans_out_to_all_subscribers_of_a_route():
    hub = RouteEventHub()
    q1 = hub.subscribe(1)
    q2 = hub.subscribe(1)
    other = hub.subscribe(2)

    hub.publish(1, {"type": "update"})

    assert q1.get_nowait() == {"type": "update"}
    assert q2.get_nowait() == {"type": "update"}
    assert other.empty()  # a different route id is untouched


def test_unsubscribe_stops_delivery():
    hub = RouteEventHub()
    q = hub.subscribe(1)
    hub.unsubscribe(1, q)
    hub.publish(1, {"x": 1})
    assert q.empty()


def test_publish_drops_when_a_subscriber_queue_is_full():
    hub = RouteEventHub(maxsize=1)
    q = hub.subscribe(1)
    hub.publish(1, {"n": 1})
    hub.publish(1, {"n": 2})  # second is dropped, not blocked
    assert q.get_nowait() == {"n": 1}
    assert q.empty()


def test_publish_to_a_route_with_no_subscribers_is_a_noop():
    hub = RouteEventHub()
    hub.publish(99, {"x": 1})  # must not raise


def test_hub_is_available_on_app_state_after_startup(client):
    # The `client` fixture runs the FastAPI lifespan, which must create the hub.
    from app.main import app
    from app.routing.events import RouteEventHub
    assert isinstance(app.state.route_hub, RouteEventHub)


def _make_route(client) -> int:
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    client.patch("/api/settings", json={"routes_enabled": True})
    return client.post("/api/routes", json={"name": "T", "start_date": "2026-07-14"}).json()["id"]


def test_events_stream_requires_routes_enabled(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    # routes disabled by default -> gated 404 (no streaming happens)
    assert client.get("/api/routes/1/events").status_code == 404


def test_events_stream_requires_auth(client):
    # routes enabled so the Gate passes and auth is what fails (401, not 404).
    rid = _make_route(client)
    client.cookies.clear()  # drop the auth cookie
    assert client.get(f"/api/routes/{rid}/events").status_code == 401


class _FakeRequest:
    """Drives the stream generator: is_disconnected() returns False for the first
    `stop_after` calls, then True (so the loop breaks)."""
    def __init__(self, stop_after: int):
        self.calls = 0
        self.stop_after = stop_after

    async def is_disconnected(self) -> bool:
        self.calls += 1
        return self.calls > self.stop_after


def test_event_stream_emits_preamble_then_data_then_unsubscribes():
    import asyncio
    import pytest
    from app.routers.routes import _route_event_stream

    async def scenario():
        hub = RouteEventHub()
        req = _FakeRequest(stop_after=1)
        gen = _route_event_stream(req, hub, 7)

        first = await gen.__anext__()          # preamble, before any is_disconnected()
        assert first.startswith(":")

        hub.publish(7, {"type": "update", "client_id": "x", "route": {"node_count": 1}})
        frame = await gen.__anext__()          # loop iter 1: delivers the queued event
        assert frame.startswith("data: ")
        assert '"node_count": 1' in frame

        with pytest.raises(StopAsyncIteration):  # loop iter 2: is_disconnected() -> True
            await gen.__anext__()

        assert hub._subs.get(7) in (None, set())  # finally-block unsubscribed

    asyncio.run(scenario())


def test_adding_a_node_publishes_an_update_with_client_id(client):
    rid = _make_route(client)
    from app.main import app
    q = app.state.route_hub.subscribe(rid)

    client.post(
        f"/api/routes/{rid}/nodes",
        json={"kind": "stop", "name": "Cafe", "lat": 52.1, "lng": 4.3},
        headers={"X-Route-Client": "tab-abc"},
    )

    event = q.get_nowait()
    assert event["type"] == "update"
    assert event["client_id"] == "tab-abc"
    assert event["route"]["node_count"] == 1


def test_broadcast_payload_omits_attachments(client):
    rid = _make_route(client)
    from app.main import app
    q = app.state.route_hub.subscribe(rid)
    client.post(f"/api/routes/{rid}/nodes", json={"kind": "stop", "name": "X", "lat": 1.0, "lng": 2.0})
    event = q.get_nowait()
    assert event["route"]["attachments"] == []  # team-private data is never broadcast


def test_broadcast_payload_omits_share(client):
    rid = _make_route(client)
    client.put(f"/api/routes/{rid}/share", json={})  # editor creates a share
    from app.main import app
    q = app.state.route_hub.subscribe(rid)
    client.post(f"/api/routes/{rid}/nodes", json={"kind": "stop", "name": "X", "lat": 1.0, "lng": 2.0})
    event = q.get_nowait()
    assert event["route"]["share"] is None  # the live token is never broadcast over SSE
    # ... even though the editor's own GET still sees it.
    assert client.get(f"/api/routes/{rid}").json()["share"] is not None


def test_deleting_a_route_publishes_a_deleted_event(client):
    rid = _make_route(client)
    from app.main import app
    q = app.state.route_hub.subscribe(rid)
    client.delete(f"/api/routes/{rid}")
    event = q.get_nowait()
    assert event["type"] == "deleted"
    assert event["route"] is None
