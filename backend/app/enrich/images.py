import io
import secrets
from pathlib import Path

import httpx
from PIL import Image, ImageOps, UnidentifiedImageError

from ..config import get_data_dir
from .safety import UnsafeURLError, safe_get

MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_IMAGE_PIXELS = 50_000_000  # reject images that would decode to a huge bitmap (DoS guard)
MAX_DIMENSION = 1280
WEBP_QUALITY = 72
_ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


class UnsupportedImageError(Exception):
    """Raised when bytes are not a supported, static raster image."""


def process_image(data: bytes) -> bytes:
    """Decode, validate, EXIF-orient, downscale, and re-encode as WebP.

    Accepts only static JPEG/PNG/WebP; raises UnsupportedImageError otherwise.
    """
    try:
        img = Image.open(io.BytesIO(data))
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise UnsupportedImageError("not a decodable image") from exc
    if img.width * img.height > MAX_IMAGE_PIXELS:
        raise UnsupportedImageError(f"image exceeds {MAX_IMAGE_PIXELS} pixels")
    try:
        img.load()
    except (OSError, Image.DecompressionBombError) as exc:
        raise UnsupportedImageError("not a decodable image") from exc
    if img.format not in _ALLOWED_FORMATS or getattr(img, "is_animated", False):
        raise UnsupportedImageError(f"unsupported image format: {img.format}")
    img = ImageOps.exif_transpose(img)
    if img.mode in ("RGBA", "LA") or "transparency" in img.info:
        img = img.convert("RGBA")
    else:
        img = img.convert("RGB")
    if max(img.width, img.height) > MAX_DIMENSION:
        img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=WEBP_QUALITY, method=6)
    return buf.getvalue()


def images_dir() -> Path:
    d = get_data_dir() / "images"
    d.mkdir(parents=True, exist_ok=True)
    return d


def save_bytes(data: bytes, suffix: str) -> str:
    name = secrets.token_hex(16) + (suffix if suffix.startswith(".") else f".{suffix}")
    (images_dir() / name).write_bytes(data)
    return f"/images/{name}"


async def localize(image_url: str | None, client: httpx.AsyncClient | None = None) -> str | None:
    if not image_url or image_url.startswith("/images/"):
        return image_url
    if not image_url.startswith(("http://", "https://")):
        return image_url
    owns = client is None
    if client is None:
        client = httpx.AsyncClient(follow_redirects=False, timeout=10.0)
    try:
        # safe_get streams with a hard MAX_IMAGE_BYTES ceiling; an over-cap body
        # raises (ResponseTooLargeError ⊂ UnsafeURLError) and we keep the URL.
        resp = await safe_get(client, image_url, max_bytes=MAX_IMAGE_BYTES)
        resp.raise_for_status()
        content = resp.content
    except (httpx.HTTPError, UnsafeURLError):
        return image_url  # non-fatal: keep the remote URL
    finally:
        if owns:
            await client.aclose()
    try:
        webp = process_image(content)
    except UnsupportedImageError:
        return image_url  # unsupported/animated/non-image: keep the remote URL
    return save_bytes(webp, ".webp")
