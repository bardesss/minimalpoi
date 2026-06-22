def test_setup_flow_and_auth(client):
    # Fresh instance needs setup.
    assert client.get("/api/auth/setup-status").json() == {"needs_setup": True}

    # Create first admin.
    resp = client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["username"] == "admin"
    assert body["role"] == "admin"

    # Setup is now closed.
    assert client.get("/api/auth/setup-status").json() == {"needs_setup": False}
    assert client.post("/api/auth/setup", json={"username": "x", "password": "y"}).status_code == 409

    # me works because setup set the cookie.
    assert client.get("/api/auth/me").json()["username"] == "admin"

    # logout clears the cookie.
    client.post("/api/auth/logout")
    assert client.get("/api/auth/me").status_code == 401

    # login again.
    assert client.post("/api/auth/login", json={"username": "admin", "password": "pw"}).status_code == 200
    assert client.get("/api/auth/me").json()["role"] == "admin"


def test_login_rejects_bad_password(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})
    client.post("/api/auth/logout")
    assert client.post("/api/auth/login", json={"username": "admin", "password": "nope"}).status_code == 401
