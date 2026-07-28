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
    # On a shared Postgres (DATABASE_URL set) each test must start from a clean
    # schema; SQLite already gets a fresh temp file per test via data_dir.
    from sqlmodel import SQLModel
    if db.engine.dialect.name != "sqlite":
        SQLModel.metadata.drop_all(db.engine)
    db.init_db()
    from app.main import app
    # Rate limiting is global state across the process; keep it off for the
    # general suite (tests that exercise it re-enable + reset it explicitly).
    app.state.limiter.reset()
    app.state.limiter.enabled = False
    from starlette.testclient import TestClient
    with TestClient(app) as c:
        yield c
    db.reset_engine()  # dispose the engine so SQLite connections are closed cleanly
