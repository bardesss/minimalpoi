from app import security


def test_password_hash_and_verify(data_dir):
    h = security.hash_password("hunter2")
    assert h != "hunter2"
    assert security.verify_password("hunter2", h) is True
    assert security.verify_password("wrong", h) is False


def test_jwt_round_trip(data_dir):
    token = security.create_access_token("alice")
    assert security.decode_access_token(token) == "alice"


def test_jwt_rejects_garbage(data_dir):
    assert security.decode_access_token("not-a-token") is None


def test_jwt_rejects_expired(data_dir):
    token = security.create_access_token("alice", expires_minutes=-1)
    assert security.decode_access_token(token) is None
