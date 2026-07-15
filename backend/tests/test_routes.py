def _admin(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    client.patch("/api/settings", json={"routes_enabled": True})


def test_routes_404_when_disabled(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    assert client.get("/api/routes").status_code == 404


def test_create_list_get_delete_route(client):
    _admin(client)
    created = client.post("/api/routes", json={"name": "NL trip", "start_date": "2026-07-14"})
    assert created.status_code == 201
    rid = created.json()["id"]

    listed = client.get("/api/routes").json()
    assert len(listed) == 1
    assert listed[0]["name"] == "NL trip"
    assert listed[0]["end_date"] is None                    # no planned end set
    assert listed[0]["scheduled_end_date"] == "2026-07-14"  # derived, no nights yet
    assert listed[0]["owner_username"] == "admin"

    detail = client.get(f"/api/routes/{rid}").json()
    assert detail["nodes"] == [] and detail["legs"] == []

    assert client.delete(f"/api/routes/{rid}").status_code == 204
    assert client.get("/api/routes").json() == []


def test_route_planned_end_date_is_stored_and_scheduled_is_derived(client):
    _admin(client)
    r = client.post("/api/routes", json={"name": "T", "start_date": "2026-07-14", "end_date": "2026-07-20"})
    assert r.status_code == 201
    body = r.json()
    assert body["end_date"] == "2026-07-20"          # stored planned end
    assert body["scheduled_end_date"] == "2026-07-14"  # no nights yet


def test_route_end_date_optional_validated_and_clearable(client):
    _admin(client)
    r = client.post("/api/routes", json={"name": "T", "start_date": "2026-07-14"})
    assert r.status_code == 201
    assert r.json()["end_date"] is None               # optional
    rid = r.json()["id"]

    bad = client.post("/api/routes", json={"name": "B", "start_date": "2026-07-14", "end_date": "2026-07-10"})
    assert bad.status_code == 422                      # end before start

    client.patch(f"/api/routes/{rid}", json={"end_date": "2026-07-20"})
    assert client.get(f"/api/routes/{rid}").json()["end_date"] == "2026-07-20"
    client.patch(f"/api/routes/{rid}", json={"end_date": None})   # explicit null clears
    assert client.get(f"/api/routes/{rid}").json()["end_date"] is None


def test_member_sees_but_cannot_edit_others_route(client):
    _admin(client)
    rid = client.post("/api/routes", json={"name": "A", "start_date": "2026-07-14"}).json()["id"]
    client.post("/api/users", json={"username": "bob", "password": "pw123456"})
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})
    assert len(client.get("/api/routes").json()) == 1          # shared visibility
    assert client.patch(f"/api/routes/{rid}", json={"name": "hax"}).status_code == 403
    assert client.delete(f"/api/routes/{rid}").status_code == 403


def test_route_patch_end_before_start_rejected(client):
    _admin(client)
    rid = client.post("/api/routes", json={"name": "P", "start_date": "2026-07-14"}).json()["id"]
    # patch an end_date before the existing start_date -> 422
    assert client.patch(f"/api/routes/{rid}", json={"end_date": "2026-07-10"}).status_code == 422
    # patch a start_date after the existing (stored) end_date -> 422
    client.patch(f"/api/routes/{rid}", json={"end_date": "2026-07-20"})
    assert client.patch(f"/api/routes/{rid}", json={"start_date": "2026-07-25"}).status_code == 422


def test_route_team_assignment_and_name(client):
    _admin(client)
    team = client.post("/api/teams", json={"name": "Crew", "member_ids": []}).json()
    r = client.post("/api/routes", json={"name": "T", "start_date": "2026-07-14", "team_id": team["id"]})
    assert r.status_code == 201
    body = r.json()
    assert body["team_id"] == team["id"]
    assert body["team_name"] == "Crew"
    assert client.get("/api/routes").json()[0]["team_name"] == "Crew"


def test_route_unknown_team_rejected(client):
    _admin(client)
    bad = client.post("/api/routes", json={"name": "T", "start_date": "2026-07-14", "team_id": 999})
    assert bad.status_code == 400


def test_member_cannot_assign_foreign_team(client):
    _admin(client)
    team = client.post("/api/teams", json={"name": "Crew", "member_ids": []}).json()
    client.post("/api/users", json={"username": "bob", "password": "pw123456"})
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})
    bad = client.post("/api/routes", json={"name": "T", "start_date": "2026-07-14", "team_id": team["id"]})
    assert bad.status_code == 403


def test_team_member_can_edit_but_not_reassign(client):
    _admin(client)
    bob = client.post("/api/users", json={"username": "bob", "password": "pw123456"}).json()
    team = client.post("/api/teams", json={"name": "Crew", "member_ids": [bob["id"]]}).json()
    rid = client.post("/api/routes", json={"name": "T", "start_date": "2026-07-14", "team_id": team["id"]}).json()["id"]
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})
    assert client.get(f"/api/routes/{rid}").json()["can_edit"] is True
    assert client.patch(f"/api/routes/{rid}", json={"name": "Bob edited"}).status_code == 200
    # a team member who is not the owner cannot reassign/clear the team
    assert client.patch(f"/api/routes/{rid}", json={"team_id": None}).status_code == 403


def test_non_member_cannot_edit_team_route(client):
    _admin(client)
    rid = client.post("/api/routes", json={"name": "T", "start_date": "2026-07-14"}).json()["id"]
    client.post("/api/users", json={"username": "carol", "password": "pw123456"})
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "carol", "password": "pw123456"})
    assert client.get(f"/api/routes/{rid}").json()["can_edit"] is False
    assert client.patch(f"/api/routes/{rid}", json={"name": "hax"}).status_code == 403
