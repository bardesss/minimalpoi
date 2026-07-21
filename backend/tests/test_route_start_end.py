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
