def _setup_admin(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})


def test_admin_can_manage_users(client):
    _setup_admin(client)

    created = client.post("/api/users", json={"username": "bob", "password": "pw"})
    assert created.status_code == 201
    bob_id = created.json()["id"]
    assert created.json()["role"] == "member"

    # duplicate username rejected
    assert client.post("/api/users", json={"username": "bob", "password": "pw"}).status_code == 409

    # list shows both
    assert len(client.get("/api/users").json()) == 2

    # disable bob, then bob cannot log in
    assert client.patch(f"/api/users/{bob_id}", json={"disabled": True}).status_code == 200
    client.post("/api/auth/logout")
    assert client.post("/api/auth/login", json={"username": "bob", "password": "pw"}).status_code == 401


def test_non_admin_forbidden(client):
    _setup_admin(client)
    client.post("/api/users", json={"username": "bob", "password": "pw"})
    client.post("/api/auth/logout")
    login_resp = client.post("/api/auth/login", json={"username": "bob", "password": "pw"})
    assert login_resp.status_code == 200
    assert client.get("/api/users").status_code == 403
    assert client.post("/api/users", json={"username": "x", "password": "y"}).status_code == 403
    assert client.patch("/api/users/1", json={}).status_code == 403
    assert client.delete("/api/users/1").status_code == 403


def test_cannot_delete_last_admin(client):
    _setup_admin(client)
    admin_id = client.get("/api/auth/me").json()["id"]
    assert client.delete(f"/api/users/{admin_id}").status_code == 400


def test_patch_and_delete_missing_user_404(client):
    _setup_admin(client)
    assert client.patch("/api/users/9999", json={"role": "admin"}).status_code == 404
    assert client.delete("/api/users/9999").status_code == 404
