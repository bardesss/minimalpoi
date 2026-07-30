import asyncio

import httpx

from app.models import LegSource
from app.routing.google import GoogleCalc


def _run(coro):
    return asyncio.run(coro)


def _directions(points: str | None):
    route: dict = {"legs": [{"distance": {"value": 1000}, "duration": {"value": 600}}]}
    if points is not None:
        route["overview_polyline"] = {"points": points}
    return {"routes": [route]}


def test_google_leg_captures_overview_polyline():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=_directions("_p~iF~ps|U_ulLnnqC"))

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    leg = _run(GoogleCalc("k", client=client).leg(52.3, 4.9, 52.1, 5.1))
    _run(client.aclose())

    assert leg is not None
    assert leg.source == LegSource.GOOGLE.value
    assert leg.distance_m == 1000
    assert leg.duration_s == 600
    assert leg.geometry == "_p~iF~ps|U_ulLnnqC"


def test_google_leg_geometry_none_when_absent():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=_directions(None))

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    leg = _run(GoogleCalc("k", client=client).leg(52.3, 4.9, 52.1, 5.1))
    _run(client.aclose())

    assert leg is not None
    assert leg.distance_m == 1000
    assert leg.geometry is None


def _route(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    client.patch("/api/settings", json={"routes_enabled": True})
    return client.post("/api/routes", json={"name": "NL", "start_date": "2026-07-14"}).json()["id"]


def test_recompute_persists_google_geometry(client, monkeypatch):
    from app.routing import service
    from app.routing.calc import HaversineCalc, Leg

    class FakeGoogle:
        client = None

        async def leg(self, *a):
            return Leg(distance_m=1000, duration_s=600, source="google", geometry="ENCODED")

    monkeypatch.setattr(service, "resolve_calc", lambda settings: (FakeGoogle(), HaversineCalc()))

    rid = _route(client)
    client.post(f"/api/routes/{rid}/nodes", json={"kind": "stay", "name": "A", "lat": 52.3, "lng": 4.9, "nights": 1})
    detail = client.post(f"/api/routes/{rid}/nodes",
                         json={"kind": "stay", "name": "B", "lat": 52.1, "lng": 5.1, "nights": 1}).json()
    assert detail["legs"][0]["geometry"] == "ENCODED"


def test_recompute_calls_legs_concurrently(client, monkeypatch):
    from app.routing import service
    from app.routing.calc import HaversineCalc, Leg

    class ConcurrentGoogle:
        client = None

        def __init__(self) -> None:
            self.in_flight = 0
            self.max_in_flight = 0

        async def leg(self, a_lat, a_lng, b_lat, b_lng):
            self.in_flight += 1
            self.max_in_flight = max(self.max_in_flight, self.in_flight)
            await asyncio.sleep(0.02)  # hold the leg open so siblings can start
            self.in_flight -= 1
            return Leg(distance_m=1000, duration_s=600, source="google", geometry="ENC")

    fake = ConcurrentGoogle()
    monkeypatch.setattr(service, "resolve_calc", lambda settings: (fake, HaversineCalc()))

    rid = _route(client)
    client.post(f"/api/routes/{rid}/nodes", json={"kind": "stay", "name": "A", "lat": 52.3, "lng": 4.9, "nights": 1})
    client.post(f"/api/routes/{rid}/nodes", json={"kind": "stay", "name": "B", "lat": 52.1, "lng": 5.1, "nights": 1})
    detail = client.post(f"/api/routes/{rid}/nodes",
                         json={"kind": "stay", "name": "C", "lat": 51.9, "lng": 5.3, "nights": 1}).json()

    # Behaviour preserved: 3 nodes -> 2 legs, computed via Google in node order.
    assert len(detail["legs"]) == 2
    assert all(leg["geometry"] == "ENC" for leg in detail["legs"])
    # The final recompute (3 nodes, 2 legs) ran both leg calls at once.
    assert fake.max_in_flight == 2
