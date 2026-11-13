"""Upload / SSRF / body-size safety (audit batch 4)."""
import httpx
import pytest

from app.enrich.safety import ResponseTooLargeError, safe_get


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_safe_get_caps_oversized_body(monkeypatch):
    from app.enrich import safety

    async def resolve(host):
        return ["93.184.216.34"]
    monkeypatch.setattr(safety, "_resolve_ips", resolve)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=b"x" * 5000)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    with pytest.raises(ResponseTooLargeError):
        await safe_get(client, "https://example.com/big", max_bytes=1000)
    await client.aclose()


@pytest.mark.anyio
async def test_safe_get_returns_small_body(monkeypatch):
    from app.enrich import safety

    async def resolve(host):
        return ["93.184.216.34"]
    monkeypatch.setattr(safety, "_resolve_ips", resolve)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="hello", headers={"content-type": "text/plain"})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    resp = await safe_get(client, "https://example.com/ok", max_bytes=1000)
    assert resp.status_code == 200
    assert resp.text == "hello"
    await client.aclose()


def test_oversized_body_413(client, monkeypatch):
    monkeypatch.setenv("MAX_BODY_MB", "1")
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    big = b"x" * (1024 * 1024 + 1)
    r = client.post("/api/images", files={"file": ("a.png", big, "image/png")})
    assert r.status_code == 413
    # under the cap still reaches the endpoint (400/415/etc, but not 413)
    r = client.post("/api/images", files={"file": ("a.png", b"x" * 1000, "image/png")})
    assert r.status_code != 413


def test_chunked_oversized_body_413(client, monkeypatch):
    monkeypatch.setenv("MAX_BODY_MB", "1")
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})

    def chunks():
        yield b'{"name": "'
        for _ in range(3):
            yield b"x" * (512 * 1024)
        yield b'"}'

    r = client.post("/api/pois", content=chunks(), headers={"content-type": "application/json"})
    assert r.status_code == 413


def test_restore_has_its_own_larger_limit(client, monkeypatch):
    from app import backup

    monkeypatch.setenv("MAX_BODY_MB", "1")
    monkeypatch.setenv("RESTORE_MAX_BYTES", str(4 * 1024 * 1024))
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    mid = b"x" * (2 * 1024 * 1024)  # over the global cap, under the restore cap
    r = client.post("/api/restore", files={"file": ("b.zip", mid, "application/zip")})
    assert r.status_code != 413
    huge = b"x" * (5 * 1024 * 1024)
    r = client.post("/api/restore", files={"file": ("b.zip", huge, "application/zip")})
    assert r.status_code == 413
    assert "RESTORE_MAX_BYTES" in r.json()["detail"]
    assert "4 MiB" in r.json()["detail"]


def test_restore_max_bytes_config(monkeypatch):
    from app import config

    monkeypatch.delenv("RESTORE_MAX_BYTES", raising=False)
    assert config.restore_max_bytes() == 500 * 1024 * 1024
    monkeypatch.setenv("RESTORE_MAX_BYTES", "1048576")
    assert config.restore_max_bytes() == 1024 * 1024
    for bad in ("nope", "0", "-5"):
        monkeypatch.setenv("RESTORE_MAX_BYTES", bad)
        assert config.restore_max_bytes() == 500 * 1024 * 1024


def _zip_bytes(payload: dict, pad: int = 0) -> bytes:
    import io
    import json
    import zipfile

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("backup.json", json.dumps(payload) + " " * pad)
    return buf.getvalue()


def test_oversize_restore_archive_names_the_limit(client, monkeypatch):
    # The upload itself is small (it compresses well) but it unpacks past the cap.
    monkeypatch.setenv("RESTORE_MAX_BYTES", str(1024 * 1024))
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    raw = _zip_bytes({"version": 2}, pad=2 * 1024 * 1024)
    assert len(raw) < 1024 * 1024
    r = client.post("/api/restore", files={"file": ("b.zip", raw, "application/zip")})
    assert r.status_code == 413
    detail = r.json()["detail"]
    assert "RESTORE_MAX_BYTES" in detail and "1 MiB" in detail


def test_backup_refuses_an_archive_that_could_not_be_restored(client, monkeypatch):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    client.post("/api/categories", json={"name": "Food"})
    assert client.get("/api/backup").status_code == 200
    monkeypatch.setenv("RESTORE_MAX_BYTES", "100")
    r = client.get("/api/backup")
    assert r.status_code == 413
    assert "RESTORE_MAX_BYTES" in r.json()["detail"]
