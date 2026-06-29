import io

import httpx
import pytest
from PIL import Image

from app.enrich import images


def _img_bytes(fmt: str, w: int, h: int, mode: str = "RGB", animated: bool = False) -> bytes:
    buf = io.BytesIO()
    if animated:
        f1 = Image.new(mode, (w, h))
        f2 = Image.new(mode, (w, h))
        f1.save(buf, format=fmt, save_all=True, append_images=[f2], duration=100, loop=0)
    else:
        # Use semi-transparent fill for alpha modes so WebP preserves the alpha channel
        # (libwebp 1.6+ strips all-opaque alpha; partial alpha forces RGBA encoding)
        fill = 0 if mode == "P" else (10, 20, 30, 200) if mode in ("RGBA", "LA") else (10, 20, 30)
        Image.new(mode, (w, h), fill).save(buf, format=fmt)
    return buf.getvalue()


def _jpeg_with_orientation(w: int, h: int, orientation: int) -> bytes:
    img = Image.new("RGB", (w, h), (10, 20, 30))
    exif = img.getexif()
    exif[0x0112] = orientation  # 0x0112 = Orientation tag
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif)
    return buf.getvalue()


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
    jpeg = _img_bytes("JPEG", 200, 150)
    http = httpx.AsyncClient(transport=httpx.MockTransport(
        lambda r: httpx.Response(200, content=jpeg, headers={"content-type": "image/jpeg"})))
    local = await images.localize("https://img.example/x.jpg", client=http)
    await http.aclose()
    assert local.startswith("/images/")
    assert local.endswith(".webp")
    name = local.rsplit("/", 1)[-1]
    with Image.open(images.images_dir() / name) as img:
        assert img.format == "WEBP"


@pytest.mark.anyio
async def test_localize_keeps_remote_url_for_gif(data_dir):
    gif = _img_bytes("GIF", 50, 50, mode="P")
    http = httpx.AsyncClient(transport=httpx.MockTransport(
        lambda r: httpx.Response(200, content=gif, headers={"content-type": "image/gif"})))
    out = await images.localize("https://img.example/anim.gif", client=http)
    await http.aclose()
    assert out == "https://img.example/anim.gif"


@pytest.mark.anyio
async def test_localize_passthrough_for_local_and_none(data_dir):
    assert await images.localize(None) is None
    assert await images.localize("/images/abc.png") == "/images/abc.png"


def test_upload_endpoint(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    png = _img_bytes("PNG", 200, 150)
    resp = client.post("/api/images", files={"file": ("p.png", png, "image/png")})
    assert resp.status_code == 201
    assert resp.json()["url"].endswith(".webp")


def test_upload_rejects_gif(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    gif = _img_bytes("GIF", 50, 50, mode="P")
    resp = client.post("/api/images", files={"file": ("a.gif", gif, "image/gif")})
    assert resp.status_code == 415


def test_upload_rejects_non_image(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    resp = client.post("/api/images", files={"file": ("x.png", b"not an image", "image/png")})
    assert resp.status_code == 415


def test_upload_requires_auth(client):
    # no setup/login -> unauthenticated
    resp = client.post("/api/images", files={"file": ("p.png", b"x", "image/png")})
    assert resp.status_code == 401


@pytest.mark.anyio
async def test_localize_rejects_oversized(data_dir):
    big = httpx.AsyncClient(transport=httpx.MockTransport(
        lambda r: httpx.Response(200, content=b"x", headers={"content-type": "image/jpeg", "content-length": str(50 * 1024 * 1024)})))
    out = await images.localize("https://img.example/huge.jpg", client=big)
    await big.aclose()
    assert out == "https://img.example/huge.jpg"


@pytest.mark.anyio
async def test_localize_returns_original_on_http_error(data_dir):
    http = httpx.AsyncClient(transport=httpx.MockTransport(lambda r: httpx.Response(500, text="err")))
    out = await images.localize("https://img.example/missing.jpg", client=http)
    await http.aclose()
    assert out == "https://img.example/missing.jpg"


def test_process_image_downscales_and_reencodes_webp():
    out = images.process_image(_img_bytes("JPEG", 3000, 2000))
    reopened = Image.open(io.BytesIO(out))
    assert reopened.format == "WEBP"
    assert reopened.size[0] == 1280  # longest side capped
    # aspect preserved (2000/3000), tolerant of ±1px rounding
    assert abs(reopened.size[1] / reopened.size[0] - 2000 / 3000) < 0.01


def test_process_image_does_not_upscale():
    out = images.process_image(_img_bytes("PNG", 400, 300))
    reopened = Image.open(io.BytesIO(out))
    assert reopened.format == "WEBP"
    assert reopened.size == (400, 300)


def test_process_image_preserves_alpha():
    out = images.process_image(_img_bytes("PNG", 100, 100, mode="RGBA"))
    reopened = Image.open(io.BytesIO(out))
    assert reopened.format == "WEBP"
    assert reopened.mode == "RGBA"


def test_process_image_applies_exif_orientation():
    # 100x60 landscape, orientation 6 => displayed rotated to 60x100 portrait.
    out = images.process_image(_jpeg_with_orientation(100, 60, 6))
    reopened = Image.open(io.BytesIO(out))
    assert reopened.size == (60, 100)


def test_process_image_rejects_static_gif():
    with pytest.raises(images.UnsupportedImageError):
        images.process_image(_img_bytes("GIF", 50, 50, mode="P"))


def test_process_image_rejects_animated_gif():
    with pytest.raises(images.UnsupportedImageError):
        images.process_image(_img_bytes("GIF", 50, 50, mode="P", animated=True))


def test_process_image_rejects_non_image():
    with pytest.raises(images.UnsupportedImageError):
        images.process_image(b"not an image at all")


def test_process_image_rejects_huge_dimensions(monkeypatch):
    monkeypatch.setattr(images, "MAX_IMAGE_PIXELS", 100)
    with pytest.raises(images.UnsupportedImageError):
        images.process_image(_img_bytes("PNG", 200, 150))  # 30000 px > 100


def test_upload_rejects_oversized(client, monkeypatch):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    import app.routers.images as imgrouter
    monkeypatch.setattr(imgrouter, "MAX_IMAGE_BYTES", 10)
    resp = client.post("/api/images", files={"file": ("p.png", _img_bytes("PNG", 200, 150), "image/png")})
    assert resp.status_code == 413
