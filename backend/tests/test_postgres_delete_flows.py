import os

import pytest
from sqlmodel import Session, select

# Importing models at collection time (rather than lazily inside each test)
# registers every table with SQLModel.metadata before the `client` fixture's
# per-test `drop_all` runs — required for this module to behave correctly
# even when run standalone against a Postgres container that already has
# tables from an earlier session (see test_fk_ondelete.py / test_migrate_
# sqlite_to_postgres.py for the same convention).
from app import db
from app.models import (
    ApiToken, DELETED_USERNAME, POI, Route, RouteLeg, RouteNode, RouteShare, User, Visit,
)

POSTGRES = (os.environ.get("TEST_POSTGRES_URL")
            or (os.environ.get("DATABASE_URL") if os.environ.get("DATABASE_URL", "").startswith(("postgres://", "postgresql")) else None))
pytestmark = pytest.mark.skipif(POSTGRES is None, reason="needs a real Postgres")


def _setup_admin(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})


def _enable_routes(client):
    assert client.patch("/api/settings", json={"routes_enabled": True}).status_code == 200


def _create_route(client, **kw):
    body = {"name": "NL", "start_date": "2026-07-14", **kw}
    return client.post("/api/routes", json=body).json()


def test_delete_poi_referenced_by_route_node_nulls_it(client):
    _setup_admin(client)
    _enable_routes(client)
    cat_id = client.post("/api/categories", json={"name": "Food"}).json()["id"]
    poi_id = client.post(
        "/api/pois", json={"name": "Amsterdam", "lat": 52.3676, "lng": 4.9041, "category_id": cat_id},
    ).json()["id"]
    rid = _create_route(client)["id"]
    node_id = client.post(
        f"/api/routes/{rid}/nodes", json={"kind": "stay", "poi_id": poi_id, "nights": 2},
    ).json()["nodes"][0]["id"]

    assert client.delete(f"/api/pois/{poi_id}").status_code == 204

    with Session(db.engine) as s:
        node = s.get(RouteNode, node_id)
        assert node is not None
        assert node.poi_id is None
        # The name/lat/lng snapshot survives so the node stays usable.
        assert node.name == "Amsterdam"


def test_delete_member_reassigns_content_and_drops_tokens(client):
    _setup_admin(client)
    _enable_routes(client)
    bob_id = client.post("/api/users", json={"username": "bob", "password": "pw123456"}).json()["id"]

    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})
    poi_id = client.post("/api/pois", json={"name": "P", "lat": 1.0, "lng": 2.0}).json()["id"]
    rid = _create_route(client)["id"]
    token = client.post("/api/tokens", json={"name": "bob-token"}).json()

    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "admin", "password": "pw123456"})
    assert client.delete(f"/api/users/{bob_id}").status_code == 204

    with Session(db.engine) as s:
        sentinel = s.exec(select(User).where(User.username == DELETED_USERNAME)).first()
        assert sentinel is not None
        poi = s.get(POI, poi_id)
        assert poi is not None and poi.created_by == sentinel.id
        route = s.get(Route, rid)
        assert route is not None and route.created_by == sentinel.id
        assert s.get(ApiToken, token["id"]) is None
        assert s.exec(select(ApiToken).where(ApiToken.user_id == bob_id)).all() == []


def test_delete_team_nulls_visit_and_route_team_id(client):
    _setup_admin(client)
    _enable_routes(client)
    admin_id = client.get("/api/auth/me").json()["id"]
    team_id = client.post("/api/teams", json={"name": "Squad", "member_ids": [admin_id]}).json()["id"]

    poi_id = client.post("/api/pois", json={"name": "P", "lat": 1.0, "lng": 2.0}).json()["id"]
    assert client.put(f"/api/pois/{poi_id}/visit", json={"team_id": team_id}).status_code == 200
    rid = _create_route(client, team_id=team_id)["id"]

    assert client.delete(f"/api/teams/{team_id}").status_code == 204

    with Session(db.engine) as s:
        visit = s.exec(select(Visit).where(Visit.poi_id == poi_id)).first()
        assert visit is not None and visit.team_id is None
        route = s.get(Route, rid)
        assert route is not None and route.team_id is None


def test_delete_category_nulls_poi_category_id(client):
    _setup_admin(client)
    cat_id = client.post("/api/categories", json={"name": "Food"}).json()["id"]
    poi_id = client.post(
        "/api/pois", json={"name": "P", "lat": 1.0, "lng": 2.0, "category_id": cat_id},
    ).json()["id"]

    assert client.delete(f"/api/categories/{cat_id}").status_code == 204

    with Session(db.engine) as s:
        poi = s.get(POI, poi_id)
        assert poi is not None and poi.category_id is None


def test_delete_route_removes_nodes_legs_and_share(client):
    _setup_admin(client)
    _enable_routes(client)
    rid = _create_route(client)["id"]
    client.post(f"/api/routes/{rid}/nodes", json={"kind": "stay", "name": "A", "lat": 1.0, "lng": 1.0, "nights": 1})
    client.post(f"/api/routes/{rid}/nodes", json={"kind": "stay", "name": "B", "lat": 2.0, "lng": 2.0, "nights": 1})
    client.put(f"/api/routes/{rid}/share", json={})

    assert client.delete(f"/api/routes/{rid}").status_code == 204

    with Session(db.engine) as s:
        assert s.exec(select(RouteNode).where(RouteNode.route_id == rid)).all() == []
        assert s.exec(select(RouteLeg).where(RouteLeg.route_id == rid)).all() == []
        assert s.exec(select(RouteShare).where(RouteShare.route_id == rid)).all() == []
