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


def test_second_start_node_409(client):
    _setup(client)
    rid = _route(client)["id"]
    r1 = client.post(f"/api/routes/{rid}/nodes", json={"kind": "stop", "role": "start", "name": "A", "lat": 1.0, "lng": 1.0})
    assert r1.status_code == 201
    r2 = client.post(f"/api/routes/{rid}/nodes", json={"kind": "stop", "role": "start", "name": "B", "lat": 2.0, "lng": 2.0})
    assert r2.status_code == 409


def test_unique_role_index_rejects_duplicate_at_db_level(client):
    import pytest
    from sqlalchemy.exc import IntegrityError
    from sqlmodel import Session

    from app import db
    from app.models import RouteNode

    _setup(client)
    rid = _route(client)["id"]
    _add(client, rid, kind="stop", role="start", name="A", lat=1.0, lng=1.0)
    with Session(db.engine) as s:
        s.add(RouteNode(route_id=rid, position=9.0, kind="stop", role="start", name="B", lat=2.0, lng=2.0))
        with pytest.raises(IntegrityError):
            s.commit()


def test_init_db_dedupes_roles_before_creating_unique_index(tmp_path):
    from sqlalchemy import create_engine, inspect, text
    from sqlmodel import SQLModel

    import app.db as dbmod

    engine = create_engine(f"sqlite:///{tmp_path / 'old.db'}")
    SQLModel.metadata.create_all(engine)
    with engine.begin() as conn:
        conn.execute(text("DROP INDEX uq_routenode_role"))
        for i, role in enumerate(["start", "start", "end", "end", "end", None], start=1):
            conn.execute(text(
                "INSERT INTO routenode (route_id, position, kind, role, name, lat, lng) "
                "VALUES (1, :p, 'stop', :r, 'n', 0, 0)"), {"p": float(i), "r": role})

    dbmod._dedupe_route_roles(engine)
    dbmod._dedupe_route_roles(engine)  # idempotent
    dbmod._add_missing_indexes(engine)

    with engine.connect() as conn:
        rows = conn.execute(text("SELECT id, role FROM routenode ORDER BY id")).all()
    assert [r[1] for r in rows] == ["start", None, "end", None, None, None]
    assert "uq_routenode_role" in {ix["name"] for ix in inspect(engine).get_indexes("routenode")}
    engine.dispose()


def test_add_node_integrity_error_without_role_is_409_not_500(client, monkeypatch):
    from sqlalchemy.exc import IntegrityError
    from sqlmodel import Session

    _setup(client)
    rid = _route(client)["id"]
    real_commit = Session.commit
    calls = {"n": 0}

    def failing_commit(self):
        calls["n"] += 1
        if calls["n"] == 1:  # the node insert, e.g. a POI deleted concurrently (FK)
            raise IntegrityError("INSERT", {}, Exception("fk violation"))
        return real_commit(self)

    monkeypatch.setattr(Session, "commit", failing_commit)
    r = client.post(f"/api/routes/{rid}/nodes", json={"kind": "stop", "name": "X", "lat": 1.0, "lng": 1.0})
    assert r.status_code == 409


def test_round_trip_sync_survives_a_concurrent_end_insert(client, monkeypatch):
    # Two concurrent start adds on a round trip both try to create the end;
    # the loser hits the unique role index and must re-read, not 500.
    from sqlmodel import Session, select

    from app import db
    from app.models import NodeRole, RouteNode, RouteNodeKind
    from app.routers import routes as routes_mod

    _setup(client)
    rid = _route(client, round_trip=True)["id"]
    real_next = routes_mod._next_position
    calls = {"n": 0}

    def racing_next_position(session, route_id):
        calls["n"] += 1
        if calls["n"] == 1:  # add_node's own call; the race is in _sync_round_trip
            return real_next(session, route_id)
        with Session(db.engine) as other:
            if other.exec(select(RouteNode).where(RouteNode.route_id == route_id,
                                                  RouteNode.role == NodeRole.END)).first() is None:
                other.add(RouteNode(route_id=route_id, kind=RouteNodeKind.STOP, role=NodeRole.END,
                                    position=99.0, name="Other", lat=9.0, lng=9.0))
                other.commit()
        return real_next(session, route_id)

    monkeypatch.setattr(routes_mod, "_next_position", racing_next_position)
    r = client.post(f"/api/routes/{rid}/nodes",
                    json={"kind": "stop", "role": "start", "name": "Home", "lat": 1.0, "lng": 1.0})
    assert r.status_code == 201, r.text
    ends = [n for n in r.json()["nodes"] if n["role"] == "end"]
    assert len(ends) == 1
    assert (ends[0]["name"], ends[0]["lat"]) == ("Home", 1.0)  # re-mirrored onto the existing end
