import pytest
from sqlmodel import Session, text

from app import db
from app.models import POI, RouteNode, Team, User, Visit


def _admin(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    assert client.patch("/api/settings", json={"routes_enabled": True}).status_code == 200


def _poi(client, name="Amsterdam"):
    cat = client.post("/api/categories", json={"name": f"c-{name}"}).json()["id"]
    return client.post(
        "/api/pois", json={"name": name, "lat": 52.3, "lng": 4.9, "category_id": cat}
    ).json()["id"]


def _node(client, poi_id):
    rid = client.post("/api/routes", json={"name": "NL", "start_date": "2026-07-14"}).json()["id"]
    return client.post(
        f"/api/routes/{rid}/nodes", json={"kind": "stay", "poi_id": poi_id, "nights": 2}
    ).json()["nodes"][0]["id"]


def test_delete_poi_nulls_route_node_poi_id(client):
    _admin(client)
    poi_id = _poi(client)
    node_id = _node(client, poi_id)
    assert client.delete(f"/api/pois/{poi_id}").status_code == 204
    with Session(db.engine) as s:
        node = s.get(RouteNode, node_id)
        assert node is not None
        assert node.poi_id is None
        assert node.name == "Amsterdam"
        assert node.lat == 52.3 and node.lng == 4.9


def test_new_poi_reusing_id_is_not_linked_to_old_route_node(client):
    _admin(client)
    poi_id = _poi(client, "Old")
    node_id = _node(client, poi_id)
    client.delete(f"/api/pois/{poi_id}")
    new_id = _poi(client, "New")  # SQLite reuses the freed rowid
    with Session(db.engine) as s:
        assert s.get(RouteNode, node_id).poi_id is None
        assert s.get(POI, new_id) is not None


def test_removed_member_can_still_mark_visited(client):
    _admin(client)
    me = client.get("/api/auth/me").json()["id"]
    team = client.post("/api/teams", json={"name": "fam", "member_ids": [me]}).json()
    assert client.patch("/api/auth/me/preferences", json={"preferred_team_id": team["id"]}).status_code == 200
    # Drop myself from the team: preferred team is now stale.
    client.patch(f"/api/teams/{team['id']}", json={"name": "fam", "member_ids": []})
    with Session(db.engine) as s:
        assert s.get(User, me).preferred_team_id is None
        # Simulate legacy stale data too.
        s.get(User, me).preferred_team_id = team["id"]
        s.commit()
    poi_id = _poi(client)
    r = client.put(f"/api/pois/{poi_id}/visit", json={"rating": 4})
    assert r.status_code == 200
    assert r.json()["team_id"] is None
    # An explicit team_id is still checked.
    poi2 = _poi(client, "Two")
    assert client.put(f"/api/pois/{poi2}/visit", json={"team_id": team["id"]}).status_code == 403


def test_delete_team_nulls_visit_and_preferred_team(client):
    _admin(client)
    me = client.get("/api/auth/me").json()["id"]
    team = client.post("/api/teams", json={"name": "fam", "member_ids": [me]}).json()
    client.patch("/api/auth/me/preferences", json={"preferred_team_id": team["id"]})
    poi_id = _poi(client)
    assert client.put(f"/api/pois/{poi_id}/visit", json={}).json()["team_id"] == team["id"]
    assert client.delete(f"/api/teams/{team['id']}").status_code == 204
    with Session(db.engine) as s:
        assert s.get(User, me).preferred_team_id is None
        assert s.exec(text("select team_id from visit")).first()[0] is None


def test_repair_dangling_refs_on_init(client):
    if db.engine.dialect.name != "sqlite":
        pytest.skip("Postgres enforces the FKs; dangling rows cannot exist")
    _admin(client)
    me = client.get("/api/auth/me").json()["id"]
    poi_id = _poi(client)
    node_id = _node(client, poi_id)
    client.put(f"/api/pois/{poi_id}/visit", json={})
    with Session(db.engine) as s:
        s.exec(text("update routenode set poi_id = 9999"))
        s.exec(text("update visit set team_id = 9999"))
        s.exec(text("update \"user\" set preferred_team_id = 9999"))
        s.commit()
    db.init_db()
    db.init_db()  # idempotent
    with Session(db.engine) as s:
        assert s.get(RouteNode, node_id).poi_id is None
        assert s.exec(text("select team_id from visit")).first()[0] is None
        assert s.get(User, me).preferred_team_id is None
