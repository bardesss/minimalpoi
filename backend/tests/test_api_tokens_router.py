def _signup(client, username="admin", password="password123"):
    return client.post("/api/auth/setup", json={"username": username, "password": password})


def test_create_lists_and_reveals_once(client):
    _signup(client)
    r = client.post("/api/tokens", json={"name": "Claude Desktop"})
    assert r.status_code == 201
    body = r.json()
    assert body["token"].startswith("mpoi_")
    assert body["name"] == "Claude Desktop" and body["prefix"] in body["token"]

    lst = client.get("/api/tokens").json()
    assert len(lst) == 1
    assert "token" not in lst[0]           # plaintext never returned again
    assert lst[0]["prefix"] == body["prefix"]


def test_created_token_works_then_revoked(client):
    _signup(client)
    token = client.post("/api/tokens", json={"name": "cli"}).json()["token"]
    tid = client.get("/api/tokens").json()[0]["id"]

    ok = client.get("/api/pois", headers={"Authorization": f"Bearer {token}"})
    assert ok.status_code == 200

    assert client.delete(f"/api/tokens/{tid}").status_code == 204
    gone = client.get("/api/pois", headers={"Authorization": f"Bearer {token}"})
    assert gone.status_code == 401


def test_cannot_touch_another_users_token(client):
    _signup(client, username="admin")
    tid = client.post("/api/tokens", json={"name": "a"}).json()["id"]
    client.post("/api/auth/logout")
    # second user (members can self-register only via admin in this app; use a
    # direct user + login through the standard flow)
    from app import db
    from app.models import User, Role
    from app.security import hash_password
    from sqlmodel import Session
    with Session(db.engine) as s:
        s.add(User(username="mallory", password_hash=hash_password("password123"), role=Role.MEMBER))
        s.commit()
    client.post("/api/auth/login", json={"username": "mallory", "password": "password123"})
    assert client.delete(f"/api/tokens/{tid}").status_code == 404
