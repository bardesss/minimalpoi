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


def test_second_start_is_conflict(client):
    _setup(client)
    rid = _route(client)["id"]
    _add(client, rid, kind="stop", role="start", name="Home", lat=1.0, lng=1.0)
    r = client.post(f"/api/routes/{rid}/nodes", json={"kind": "stop", "role": "start", "name": "Other", "lat": 9.0, "lng": 9.0})
    assert r.status_code == 409


def test_role_node_is_forced_to_stop_without_nights(client):
    _setup(client)
    rid = _route(client)["id"]
    detail = client.post(f"/api/routes/{rid}/nodes",
                         json={"kind": "stay", "role": "start", "name": "Home", "lat": 1.0, "lng": 1.0, "nights": 4}).json()
    start = detail["nodes"][0]
    assert start["kind"] == "stop"
    assert start["nights"] is None


def test_append_lands_after_middles_not_at_the_pinned_end(client):
    _setup(client)
    rid = _route(client)["id"]
    # start + end pins first, then two appended middle stops must stay between them.
    _add(client, rid, kind="stop", role="start", name="Home", lat=1.0, lng=1.0)
    _add(client, rid, kind="stop", role="end", name="Finish", lat=9.0, lng=9.0)
    _add(client, rid, kind="stop", name="M1", lat=2.0, lng=2.0)
    detail = _add(client, rid, kind="stop", name="M2", lat=3.0, lng=3.0)
    names = [n["name"] for n in detail["nodes"]]
    assert names == ["Home", "M1", "M2", "Finish"]
    nodes = {n["name"]: n for n in detail["nodes"]}
    # Appended middles must get distinct, increasing positions (the _next_position fix).
    # Note: start/end position values are NOT pinned to extreme values in this model —
    # ordered_nodes() sorts by (role_rank, position), so role rank alone (not the raw
    # position number) keeps start/end at the ends regardless of their position value.
    assert nodes["M1"]["position"] < nodes["M2"]["position"]


def test_round_trip_mirrors_start_to_a_generated_end(client):
    _setup(client)
    rid = _route(client, round_trip=True)["id"]
    detail = _add(client, rid, kind="stop", role="start", name="Home", lat=1.0, lng=2.0)
    end = detail["nodes"][-1]
    assert end["role"] == "end"
    assert end["name"] == "Home" and end["lat"] == 1.0 and end["lng"] == 2.0


def test_toggling_round_trip_on_generates_end_from_existing_start(client):
    _setup(client)
    rid = _route(client)["id"]
    _add(client, rid, kind="stop", role="start", name="Home", lat=1.0, lng=2.0)
    detail = client.patch(f"/api/routes/{rid}", json={"round_trip": True}).json()
    assert detail["nodes"][-1]["role"] == "end"
    assert detail["nodes"][-1]["name"] == "Home"
