def _setup_with_member(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})
    bob = client.post("/api/users", json={"username": "bob", "password": "pw"}).json()
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
