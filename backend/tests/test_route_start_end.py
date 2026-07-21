def _setup(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    client.patch("/api/settings", json={"routes_enabled": True})


def _route(client, **kw):
    body = {"name": "NL", "start_date": "2026-07-14", **kw}
    return client.post("/api/routes", json=body).json()


def test_route_exposes_round_trip_default_false(client):
    _setup(client)
    r = _route(client)
    assert r["round_trip"] is False


def test_round_trip_can_be_set_on_create(client):
    _setup(client)
    r = _route(client, round_trip=True)
    assert r["round_trip"] is True


def _add(client, rid, **kw):
    return client.post(f"/api/routes/{rid}/nodes", json=kw).json()


def test_start_and_end_pin_to_the_ends_regardless_of_position(client):
    _setup(client)
    rid = _route(client)["id"]
    # Add an end (high role rank) and a start (low rank) plus a middle stop.
    _add(client, rid, kind="stop", role="end", name="Finish", lat=3.0, lng=3.0)
    _add(client, rid, kind="stop", name="Middle", lat=2.0, lng=2.0)
    detail = _add(client, rid, kind="stop", role="start", name="Home", lat=1.0, lng=1.0)
    names = [n["name"] for n in detail["nodes"]]
    assert names[0] == "Home"
    assert names[-1] == "Finish"
    assert detail["nodes"][0]["role"] == "start"
    assert detail["nodes"][-1]["role"] == "end"
