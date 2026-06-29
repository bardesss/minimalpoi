def test_sync_now_requires_admin(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    client.post("/api/users", json={"username": "bob", "password": "pw123456"})
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})
    assert client.post("/api/sync/now").status_code == 403


def test_sync_now_noop_when_not_configured(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    resp = client.post("/api/sync/now")
    assert resp.status_code == 200
    assert resp.json()["ran"] is False  # TRIP not configured


def test_sync_status_shape(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    body = client.get("/api/sync/status").json()
    assert body["enabled"] is False
    assert "error_count" in body and "conflict_count" in body
