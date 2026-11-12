from app import security
from app.models import User


def _user(**kw):
    return User(id=7, username="alice", password_hash="!", **kw)


def test_password_hash_and_verify(data_dir):
    h = security.hash_password("hunter2")
    assert h != "hunter2"
    assert security.verify_password("hunter2", h) is True
    assert security.verify_password("wrong", h) is False


def test_jwt_round_trip(data_dir):
    token = security.create_access_token(_user(token_version=3, session_version=2))
    payload = security.decode_access_token(token)
    assert payload["sub"] == "7"
    assert payload["tv"] == 3
    assert payload["sv"] == 2
    assert isinstance(payload["iat"], int)


def test_jwt_rejects_garbage(data_dir):
    assert security.decode_access_token("not-a-token") is None


def test_jwt_rejects_expired(data_dir):
    token = security.create_access_token(_user(), expires_minutes=-1)
    assert security.decode_access_token(token) is None


def test_verify_password_handles_malformed_hash(data_dir):
    assert security.verify_password("password", "not-a-valid-hash") is False
    assert security.verify_password("password", "") is False
