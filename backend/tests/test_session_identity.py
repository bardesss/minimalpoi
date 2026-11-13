"""Session identity: the login cookie names the user by id, and logout /
disable / account re-creation all invalidate it."""
from datetime import datetime, timedelta, timezone

import jwt
from sqlmodel import Session

ME = "/api/auth/me"


def _setup_admin(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})


def _login(client, username, password="pw123456") -> str:
    client.cookies.clear()
    resp = client.post("/api/auth/login", json={"username": username, "password": password})
    assert resp.status_code == 200
    return client.cookies["access_token"]


def _get_with_cookie(client, token, path=ME):
    """GET `path` presenting only `token` as the login cookie."""
    saved = dict(client.cookies)
    client.cookies.clear()
    client.cookies.set("access_token", token)
    try:
        return client.get(path)
    finally:
        client.cookies.clear()
        for k, v in saved.items():
            client.cookies.set(k, v)


def test_recreated_username_rejects_old_cookie(client):
    _setup_admin(client)
    admin_cookie = client.cookies["access_token"]
    bob_id = client.post("/api/users", json={"username": "bob", "password": "pw123456"}).json()["id"]
    bob_cookie = _login(client, "bob")
    assert _get_with_cookie(client, bob_cookie).status_code == 200

    client.cookies.clear()
    client.cookies.set("access_token", admin_cookie)
    assert client.delete(f"/api/users/{bob_id}").status_code == 204
    assert client.post("/api/users", json={"username": "bob", "password": "pw123456"}).status_code == 201

    assert _get_with_cookie(client, bob_cookie).status_code == 401


def test_reused_user_id_rejects_token_minted_before_creation(client):
    # SQLite may hand a deleted user's id to a new account; a token issued
    # before that account existed must not authenticate as it.
    from app import db
    from app.models import User
    from app.security import create_access_token

    _setup_admin(client)
    bob_id = client.post("/api/users", json={"username": "bob", "password": "pw123456"}).json()["id"]
    with Session(db.engine) as s:
        bob = s.get(User, bob_id)
        bob.created_at = datetime.now(timezone.utc) - timedelta(hours=1)
        s.add(bob)
        s.commit()
        s.refresh(bob)
        old_token = create_access_token(bob)
        # "Re-create" the account with the same id, created after the token.
        bob.created_at = datetime.now(timezone.utc) + timedelta(minutes=5)
        s.add(bob)
        s.commit()
    assert _get_with_cookie(client, old_token).status_code == 401


def test_token_minted_in_creation_second_is_valid(client):
    from app import db
    from app.models import User
    from app.security import create_access_token

    _setup_admin(client)
    bob_id = client.post("/api/users", json={"username": "bob", "password": "pw123456"}).json()["id"]
    with Session(db.engine) as s:
        bob = s.get(User, bob_id)
        # created_at a fraction of a second after the token's whole-second iat.
        bob.created_at = datetime.now(timezone.utc).replace(microsecond=999_999)
        s.add(bob)
        s.commit()
        s.refresh(bob)
        token = create_access_token(bob)
    assert _get_with_cookie(client, token).status_code == 200


def test_logout_invalidates_cookie(client):
    _setup_admin(client)
    copied = client.cookies["access_token"]
    assert client.post("/api/auth/logout").status_code == 200
    assert _get_with_cookie(client, copied).status_code == 401


def test_logout_ends_every_session_of_that_user(client):
    _setup_admin(client)
    first = client.cookies["access_token"]
    second = _login(client, "admin")
    assert client.post("/api/auth/logout").status_code == 200
    assert _get_with_cookie(client, first).status_code == 401
    assert _get_with_cookie(client, second).status_code == 401


def test_logout_without_session_is_ok(client):
    assert client.post("/api/auth/logout").status_code == 200


def test_logout_keeps_api_tokens_valid(client):
    _setup_admin(client)
    token = client.post("/api/tokens", json={"name": "ci"}).json()["token"]
    assert client.post("/api/auth/logout").status_code == 200
    client.cookies.clear()
    resp = client.get(ME, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200


def test_disable_revokes_tokens_and_reenable_does_not_restore_them(client):
    _setup_admin(client)
    admin_cookie = client.cookies["access_token"]
    bob_id = client.post("/api/users", json={"username": "bob", "password": "pw123456"}).json()["id"]
    bob_cookie = _login(client, "bob")
    bob_api = client.post("/api/tokens", json={"name": "ci"}).json()["token"]
    bearer = {"Authorization": f"Bearer {bob_api}"}

    client.cookies.clear()
    client.cookies.set("access_token", admin_cookie)
    assert client.patch(f"/api/users/{bob_id}", json={"disabled": True}).status_code == 200
    assert client.patch(f"/api/users/{bob_id}", json={"disabled": False}).status_code == 200

    assert _get_with_cookie(client, bob_cookie).status_code == 401
    client.cookies.clear()
    assert client.get(ME, headers=bearer).status_code == 401
    # Bob can still log in afresh once re-enabled.
    assert _get_with_cookie(client, _login(client, "bob")).status_code == 200


def test_legacy_username_sub_is_401(client):
    from app.config import get_secret_key

    _setup_admin(client)
    legacy = jwt.encode(
        {"sub": "admin", "tv": 0, "exp": datetime.now(timezone.utc) + timedelta(days=1)},
        get_secret_key(),
        algorithm="HS256",
    )
    assert _get_with_cookie(client, legacy).status_code == 401


def test_token_claims_name_the_user_by_id(client):
    from app.security import decode_access_token

    _setup_admin(client)
    payload = decode_access_token(client.cookies["access_token"])
    me = client.get(ME).json()
    assert payload["sub"] == str(me["id"])
    assert payload["tv"] == 0 and payload["sv"] == 0
    assert isinstance(payload["iat"], int)
