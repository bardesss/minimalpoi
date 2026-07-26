from datetime import datetime

from app import db
from app.apitokens import generate_api_token, hash_api_token, resolve_api_token
from app.models import ApiToken, User, utcnow
from app.security import hash_password
from sqlmodel import Session


def _user(session, disabled=False, token_version=0):
    u = User(username="alice", password_hash=hash_password("pw"),
             disabled=disabled, token_version=token_version)
    session.add(u)
    session.commit()
    session.refresh(u)
    return u


def _store_token(session, user, token_version=0):
    full, prefix, token_hash = generate_api_token()
    row = ApiToken(user_id=user.id, name="Claude", token_hash=token_hash,
                   prefix=prefix, token_version=token_version)
    session.add(row)
    session.commit()
    return full, row


def test_generate_shape_and_hash(data_dir):
    full, prefix, token_hash = generate_api_token()
    assert full.startswith("mpoi_")
    assert prefix in full
    assert token_hash == hash_api_token(full)
    assert token_hash != full  # never store plaintext


def test_resolve_valid_token_returns_user_and_touches_last_used(data_dir):
    db.reset_engine(); db.init_db()
    with Session(db.engine) as session:
        user = _user(session)
        full, row = _store_token(session, user)
        resolved = resolve_api_token(session, full)
        assert resolved is not None and resolved.id == user.id
        session.refresh(row)
        assert isinstance(row.last_used_at, datetime)


def test_resolve_rejects_unknown_disabled_and_stale(data_dir):
    db.reset_engine(); db.init_db()
    with Session(db.engine) as session:
        assert resolve_api_token(session, "mpoi_deadbeef_nope") is None

        disabled_user = _user(session, disabled=True)
        full, _ = _store_token(session, disabled_user)
        assert resolve_api_token(session, full) is None

    with Session(db.engine) as session:
        user = User(username="bob", password_hash=hash_password("pw"), token_version=5)
        session.add(user); session.commit(); session.refresh(user)
        full, _ = _store_token(session, user, token_version=4)  # snapshot < current
        assert resolve_api_token(session, full) is None
