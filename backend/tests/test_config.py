from app import config, crypto


def test_secret_key_is_generated_and_persisted(data_dir):
    key1 = config.get_secret_key()
    assert key1
    assert (data_dir / "secret.key").exists()
    config.reset_config_cache()
    key2 = config.get_secret_key()
    assert key1 == key2  # persisted, stable across restarts


def test_secret_key_env_override(data_dir, monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "override-secret")
    config.reset_config_cache()
    assert config.get_secret_key() == "override-secret"


def test_session_lifetime_defaults(monkeypatch):
    monkeypatch.delenv("SESSION_LIFETIME_DAYS", raising=False)
    assert config.get_session_lifetime_days() == config.DEFAULT_SESSION_LIFETIME_DAYS


def test_session_lifetime_env_override(monkeypatch):
    monkeypatch.setenv("SESSION_LIFETIME_DAYS", "7")
    assert config.get_session_lifetime_days() == 7


def test_session_lifetime_ignores_invalid(monkeypatch):
    monkeypatch.setenv("SESSION_LIFETIME_DAYS", "nope")
    assert config.get_session_lifetime_days() == config.DEFAULT_SESSION_LIFETIME_DAYS
    monkeypatch.setenv("SESSION_LIFETIME_DAYS", "0")
    assert config.get_session_lifetime_days() == config.DEFAULT_SESSION_LIFETIME_DAYS


def test_crypto_round_trip(data_dir):
    token = crypto.encrypt("hunter2")
    assert token != "hunter2"
    assert crypto.decrypt(token) == "hunter2"
