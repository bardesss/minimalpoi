def test_setup_flow_and_auth(client):
    # Fresh instance needs setup.
    assert client.get("/api/auth/setup-status").json() == {"needs_setup": True}

    # Create first admin.
    resp = client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["username"] == "admin"
    assert body["role"] == "admin"

    # Setup is now closed.
    assert client.get("/api/auth/setup-status").json() == {"needs_setup": False}
    assert client.post("/api/auth/setup", json={"username": "second", "password": "pw123456"}).status_code == 409

    # me works because setup set the cookie.
    assert client.get("/api/auth/me").json()["username"] == "admin"

    # logout clears the cookie.
    client.post("/api/auth/logout")
    assert client.get("/api/auth/me").status_code == 401

    # login again.
    assert client.post("/api/auth/login", json={"username": "admin", "password": "pw123456"}).status_code == 200
    assert client.get("/api/auth/me").json()["role"] == "admin"


def test_auth_cookie_is_persistent(client):
    # The login/setup cookie must carry Max-Age so the browser keeps it across
    # restarts; a bare session cookie forced a re-login on every reopen.
    resp = client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    set_cookie = resp.headers["set-cookie"]
    assert "access_token=" in set_cookie
    assert "Max-Age=" in set_cookie


def test_login_rejects_bad_password(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    client.post("/api/auth/logout")
    assert client.post("/api/auth/login", json={"username": "admin", "password": "nope"}).status_code == 401


def test_login_rejects_disabled_user(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    from sqlmodel import Session, select
    from app import db
    from app.models import User
    from app.security import hash_password
    with Session(db.engine) as session:
        session.add(User(username="bob", password_hash=hash_password("pw"), disabled=True))
        session.commit()
    client.post("/api/auth/logout")
    assert client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"}).status_code == 401


def test_login_is_case_insensitive(client):
    client.post("/api/auth/setup", json={"username": "Admin", "password": "pw123456"})
    client.post("/api/auth/logout")
    r = client.post("/api/auth/login", json={"username": "  ADMIN ", "password": "pw123456"})
    assert r.status_code == 200
    assert r.json()["username"] == "admin"


def test_setup_second_concurrent_admin_is_rolled_back_409(client, monkeypatch):
    from sqlmodel import Session, select
    from app import db
    from app.models import User
    from app.security import hash_password

    with Session(db.engine) as s:
        s.add(User(username="first", password_hash=hash_password("pw123456")))
        s.commit()
    # Simulate losing the race: the pre-check saw no users.
    monkeypatch.setattr("app.routers.auth._any_user_exists", lambda session: False)
    r = client.post("/api/auth/setup", json={"username": "second", "password": "pw123456"})
    assert r.status_code == 409
    with Session(db.engine) as s:
        assert [u.username for u in s.exec(select(User)).all()] == ["first"]


def test_login_with_over_72_byte_password_is_401_not_500(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    client.post("/api/auth/logout")
    for pw in ("a" * 100, "é" * 40):
        assert client.post("/api/auth/login", json={"username": "admin", "password": pw}).status_code == 401
