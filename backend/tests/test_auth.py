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


def test_auth_cookie_is_persistent(client):
    # The login/setup cookie must carry Max-Age so the browser keeps it across
    # restarts; a bare session cookie forced a re-login on every reopen.
    resp = client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})
    set_cookie = resp.headers["set-cookie"]
    assert "access_token=" in set_cookie
    assert "Max-Age=" in set_cookie


def test_login_rejects_bad_password(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})
    client.post("/api/auth/logout")
    assert client.post("/api/auth/login", json={"username": "admin", "password": "nope"}).status_code == 401


def test_login_rejects_disabled_user(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})
    from sqlmodel import Session, select
    from app import db
    from app.models import User
    from app.security import hash_password
    with Session(db.engine) as session:
        session.add(User(username="bob", password_hash=hash_password("pw"), disabled=True))
        session.commit()
    client.post("/api/auth/logout")
    assert client.post("/api/auth/login", json={"username": "bob", "password": "pw"}).status_code == 401
