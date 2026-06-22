import pytest


@pytest.fixture(autouse=True)
def _safe_resolver(monkeypatch):
    monkeypatch.setattr("app.enrich.safety._resolve_ips", lambda host: ["93.184.216.34"])


@pytest.fixture
def data_dir(tmp_path, monkeypatch):
    """Point the app at an isolated temp data dir and reset cached config."""
    d = tmp_path / "data"
    d.mkdir()
    monkeypatch.setenv("MINIMALPOI_DATA_DIR", str(d))
    monkeypatch.delenv("SECRET_KEY", raising=False)
    from app import config
    config.reset_config_cache()
    yield d
    config.reset_config_cache()


@pytest.fixture
def client(data_dir):
    from app import db
    db.reset_engine()
    db.init_db()
    from app.main import app
    from starlette.testclient import TestClient
    with TestClient(app) as c:
        yield c
    db.reset_engine()  # dispose the engine so SQLite connections are closed cleanly
