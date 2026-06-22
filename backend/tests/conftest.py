import pytest


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
