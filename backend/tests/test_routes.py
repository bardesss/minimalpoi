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
    assert listed[0]["end_date"] == "2026-07-14"      # no nights yet
    assert listed[0]["owner_username"] == "admin"

    detail = client.get(f"/api/routes/{rid}").json()
    assert detail["nodes"] == [] and detail["legs"] == []

    assert client.delete(f"/api/routes/{rid}").status_code == 204
    assert client.get("/api/routes").json() == []


def test_member_sees_but_cannot_edit_others_route(client):
    _admin(client)
    rid = client.post("/api/routes", json={"name": "A", "start_date": "2026-07-14"}).json()["id"]
    client.post("/api/users", json={"username": "bob", "password": "pw123456"})
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})
    assert len(client.get("/api/routes").json()) == 1          # shared visibility
    assert client.patch(f"/api/routes/{rid}", json={"name": "hax"}).status_code == 403
    assert client.delete(f"/api/routes/{rid}").status_code == 403
