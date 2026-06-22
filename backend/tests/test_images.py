import httpx
import pytest

from app.enrich import images


@pytest.fixture
def anyio_backend():
    return "asyncio"


def test_save_bytes_writes_file_and_returns_local_url(data_dir):
    url = images.save_bytes(b"\x89PNG\r\n", ".png")
    assert url.startswith("/images/")
    name = url.rsplit("/", 1)[-1]
    assert (images.images_dir() / name).read_bytes() == b"\x89PNG\r\n"


@pytest.mark.anyio
async def test_localize_downloads_remote(data_dir):
    http = httpx.AsyncClient(transport=httpx.MockTransport(
        lambda r: httpx.Response(200, content=b"IMGDATA", headers={"content-type": "image/jpeg"})))
    local = await images.localize("https://img.example/x.jpg", client=http)
    await http.aclose()
    assert local.startswith("/images/")
    assert local.endswith(".jpg")


@pytest.mark.anyio
async def test_localize_passthrough_for_local_and_none(data_dir):
    assert await images.localize(None) is None
    assert await images.localize("/images/abc.png") == "/images/abc.png"


def test_upload_endpoint(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})
    resp = client.post("/api/images", files={"file": ("p.png", b"\x89PNG", "image/png")})
    assert resp.status_code == 201
    assert resp.json()["url"].startswith("/images/")


def test_upload_requires_auth(client):
    # no setup/login -> unauthenticated
    resp = client.post("/api/images", files={"file": ("p.png", b"x", "image/png")})
    assert resp.status_code == 401


@pytest.mark.anyio
async def test_localize_returns_original_on_http_error(data_dir):
    http = httpx.AsyncClient(transport=httpx.MockTransport(lambda r: httpx.Response(500, text="err")))
    out = await images.localize("https://img.example/missing.jpg", client=http)
    await http.aclose()
    assert out == "https://img.example/missing.jpg"
