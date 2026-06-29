import pytest
from app.routers import version as ver


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_cached_latest_throttles_repeated_failures(monkeypatch):
    ver._cache["latest"] = None
    ver._cache["at"] = 0.0
    calls = {"n": 0}

    async def failing():
        calls["n"] += 1
        return None

    monkeypatch.setattr(ver, "_fetch_latest", failing)
    try:
        await ver._cached_latest()  # first call fetches (and fails)
        await ver._cached_latest()  # within TTL → must NOT fetch again
        assert calls["n"] == 1
    finally:
        ver._cache["latest"] = None
        ver._cache["at"] = 0.0


def _setup(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})


def test_parse_semver():
    assert ver._parse_semver("v1.2.3") == (1, 2, 3)
    assert ver._parse_semver("0.4.0") == (0, 4, 0)
    assert ver._parse_semver("dev") is None


def test_version_current_from_env(client, monkeypatch):
    _setup(client)
    monkeypatch.setenv("MINIMALPOI_VERSION", "0.3.0")

    async def fake(client=None):
        return "0.3.0"

    monkeypatch.setattr(ver, "_cached_latest", fake)
    body = client.get("/api/version").json()
    assert body["current"] == "0.3.0"
    assert body["update_available"] is False


def test_version_update_available(client, monkeypatch):
    _setup(client)
    monkeypatch.setenv("MINIMALPOI_VERSION", "0.3.0")

    async def fake(client=None):
        return "0.4.0"

    monkeypatch.setattr(ver, "_cached_latest", fake)
    body = client.get("/api/version").json()
    assert body["latest"] == "0.4.0"
    assert body["update_available"] is True


def test_version_dev_never_updates(client, monkeypatch):
    _setup(client)
    monkeypatch.delenv("MINIMALPOI_VERSION", raising=False)

    async def fake(client=None):
        return "0.4.0"

    monkeypatch.setattr(ver, "_cached_latest", fake)
    body = client.get("/api/version").json()
    assert body["current"] == "dev"
    assert body["update_available"] is False


def test_version_fail_silent_when_latest_unknown(client, monkeypatch):
    _setup(client)
    monkeypatch.setenv("MINIMALPOI_VERSION", "0.3.0")

    async def fake(client=None):
        return None

    monkeypatch.setattr(ver, "_cached_latest", fake)
    body = client.get("/api/version").json()
    assert body["latest"] is None
    assert body["update_available"] is False


def test_version_requires_auth(client):
    assert client.get("/api/version").status_code == 401
