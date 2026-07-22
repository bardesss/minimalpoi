def _setup(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    client.patch("/api/settings", json={"routes_enabled": True})


def _route(client, **kw):
    return client.post("/api/routes", json={"name": "NL", "start_date": "2026-07-14", **kw}).json()


def _add(client, rid, **kw):
    return client.post(f"/api/routes/{rid}/nodes", json=kw).json()


def _patch(client, rid, nid, **kw):
    return client.patch(f"/api/routes/{rid}/nodes/{nid}", json=kw).json()


def test_relocate_start_keeps_node_id_and_updates_location(client):
    _setup(client)
    rid = _route(client)["id"]
    detail = _add(client, rid, kind="stop", role="start", name="Home", lat=1.0, lng=1.0)
    start = detail["nodes"][0]
    detail = _patch(client, rid, start["id"], name="Cabin", lat=5.0, lng=6.0)
    moved = next(n for n in detail["nodes"] if n["id"] == start["id"])
    assert moved["name"] == "Cabin"
    assert moved["lat"] == 5.0 and moved["lng"] == 6.0
    assert moved["role"] == "start"


def test_relocate_start_resyncs_round_trip_end(client):
    _setup(client)
    rid = _route(client, round_trip=True)["id"]
    detail = _add(client, rid, kind="stop", role="start", name="Home", lat=1.0, lng=1.0)
    start = next(n for n in detail["nodes"] if n["role"] == "start")
    detail = _patch(client, rid, start["id"], name="Cabin", lat=5.0, lng=6.0)
    end = next(n for n in detail["nodes"] if n["role"] == "end")
    assert end["lat"] == 5.0 and end["lng"] == 6.0  # end mirrors the new start


def test_non_location_update_still_works(client):
    _setup(client)
    rid = _route(client)["id"]
    detail = _add(client, rid, kind="stay", name="Hotel", lat=1.0, lng=1.0, nights=1)
    stay = detail["nodes"][0]
    detail = _patch(client, rid, stay["id"], nights=3)
    assert next(n for n in detail["nodes"] if n["id"] == stay["id"])["nights"] == 3
