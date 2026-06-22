import json

import httpx
import pytest

from app.trip.client import TripClient


class FakeTrip:
    def __init__(self):
        self.places: dict[int, dict] = {}
        self.categories: dict[int, dict] = {}
        self._next = {"place": 1, "cat": 1}

    def _id(self, kind):
        v = self._next[kind]
        self._next[kind] += 1
        return v

    def handler(self, request: httpx.Request) -> httpx.Response:
        p, m = request.url.path, request.method
        if p == "/api/auth/login":
            return httpx.Response(200, json={"access_token": "good", "refresh_token": "r"})
        body = json.loads(request.content) if request.content else {}
        if p == "/api/categories" and m == "GET":
            return httpx.Response(200, json=list(self.categories.values()))
        if p == "/api/categories" and m == "POST":
            cid = self._id("cat"); rec = {"id": cid, **body}; self.categories[cid] = rec
            return httpx.Response(200, json=rec)
        if p.startswith("/api/categories/") and m == "PUT":
            cid = int(p.rsplit("/", 1)[1]); self.categories[cid].update(body)
            return httpx.Response(200, json=self.categories[cid])
        if p.startswith("/api/categories/") and m == "DELETE":
            self.categories.pop(int(p.rsplit("/", 1)[1]), None)
            return httpx.Response(200, json={"ok": True})
        if p == "/api/places" and m == "GET":
            return httpx.Response(200, json=list(self.places.values()))
        if p == "/api/places" and m == "POST":
            pid = self._id("place"); rec = {"id": pid, **body}; self.places[pid] = rec
            return httpx.Response(200, json=rec)
        if p.startswith("/api/places/") and m == "PUT":
            pid = int(p.rsplit("/", 1)[1]); self.places[pid].update(body)
            return httpx.Response(200, json=self.places[pid])
        if p.startswith("/api/places/") and m == "DELETE":
            self.places.pop(int(p.rsplit("/", 1)[1]), None)
            return httpx.Response(200, json={"ok": True})
        return httpx.Response(404)


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
def fake_trip():
    return FakeTrip()


@pytest.fixture
def trip_client(fake_trip):
    http = httpx.AsyncClient(transport=httpx.MockTransport(fake_trip.handler))
    yield TripClient("https://trip.lan", "me", "pw", http), http
