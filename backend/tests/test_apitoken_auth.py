from app import db
from app.apitokens import generate_api_token
from app.models import ApiToken, User
from app.security import hash_password
from sqlmodel import Session


def _make_token(username="alice", token_version=0, row_version=0, disabled=False):
    with Session(db.engine) as session:
        user = User(username=username, password_hash=hash_password("pw"),
                    token_version=token_version, disabled=disabled)
        session.add(user); session.commit(); session.refresh(user)
        full, prefix, token_hash = generate_api_token()
        session.add(ApiToken(user_id=user.id, name="t", token_hash=token_hash,
                             prefix=prefix, token_version=row_version))
        session.commit()
    return full


def test_valid_token_authenticates_api_call(client):
    token = _make_token()
    r = client.get("/api/pois", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200


def test_missing_and_bad_token_rejected(client):
    assert client.get("/api/pois").status_code == 401
    r = client.get("/api/pois", headers={"Authorization": "Bearer mpoi_x_nope"})
    assert r.status_code == 401


def test_stale_snapshot_and_disabled_rejected(client):
    stale = _make_token(username="bob", token_version=3, row_version=2)
    assert client.get("/api/pois", headers={"Authorization": f"Bearer {stale}"}).status_code == 401
    off = _make_token(username="carol", disabled=True)
    assert client.get("/api/pois", headers={"Authorization": f"Bearer {off}"}).status_code == 401
