def _setup_with_member(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    bob = client.post("/api/users", json={"username": "bob", "password": "pw123456"}).json()
    return bob["id"]


def test_team_crud(client):
    bob_id = _setup_with_member(client)
    me_id = client.get("/api/auth/me").json()["id"]

    created = client.post("/api/teams", json={"name": "family", "member_ids": [me_id, bob_id]})
    assert created.status_code == 201
    team = created.json()
    assert team["name"] == "family"
    assert set(team["member_ids"]) == {me_id, bob_id}

    # rename + drop bob
    updated = client.patch(f"/api/teams/{team['id']}", json={"name": "fam", "member_ids": [me_id]})
    assert updated.json()["name"] == "fam"
    assert updated.json()["member_ids"] == [me_id]

    assert len(client.get("/api/teams").json()) == 1
    assert client.delete(f"/api/teams/{team['id']}").status_code == 204
    assert client.get("/api/teams").json() == []


def test_non_creator_cannot_edit_or_delete_team(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    me_id = client.get("/api/auth/me").json()["id"]
    bob = client.post("/api/users", json={"username": "bob", "password": "pw123456"}).json()
    # admin creates a team
    team = client.post("/api/teams", json={"name": "fam", "member_ids": [me_id]}).json()
    # bob (member, not creator, not admin) logs in and is forbidden
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})
    assert client.patch(f"/api/teams/{team['id']}", json={"name": "hijack", "member_ids": []}).status_code == 403
    assert client.delete(f"/api/teams/{team['id']}").status_code == 403


def test_admin_can_manage_any_team(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    bob = client.post("/api/users", json={"username": "bob", "password": "pw123456"}).json()
    # bob creates a team
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})
    team = client.post("/api/teams", json={"name": "bobteam", "member_ids": [bob["id"]]}).json()
    # admin can edit it
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "admin", "password": "pw123456"})
    assert client.patch(f"/api/teams/{team['id']}", json={"name": "renamed", "member_ids": []}).status_code == 200


def test_create_team_rejects_unknown_member(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    assert client.post("/api/teams", json={"name": "x", "member_ids": [9999]}).status_code == 400


def test_team_candidates_lists_id_and_username(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    client.post("/api/users", json={"username": "bob", "password": "pw123456", "role": "member"})
    cands = client.get("/api/teams/candidates").json()
    names = {c["username"] for c in cands}
    assert {"admin", "bob"} <= names
    assert all(set(c.keys()) == {"id", "username"} for c in cands)


def test_team_candidates_requires_auth(client):
    assert client.get("/api/teams/candidates").status_code == 401
