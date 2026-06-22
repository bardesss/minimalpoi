import secrets
from pathlib import Path

import httpx

from ..config import get_data_dir
from .safety import UnsafeURLError, safe_get

_CONTENT_SUFFIX = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}

MAX_IMAGE_BYTES = 10 * 1024 * 1024


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
        resp = await safe_get(client, image_url)
        resp.raise_for_status()
        cl_header = resp.headers.get("content-length")
        if cl_header is not None:
            try:
                if int(cl_header) > MAX_IMAGE_BYTES:
                    return image_url
            except (ValueError, TypeError):
                pass
        content = resp.content
        if len(content) > MAX_IMAGE_BYTES:
            return image_url
        ctype = resp.headers.get("content-type", "").split(";")[0].strip()
    except (httpx.HTTPError, UnsafeURLError):
        return image_url  # non-fatal: keep the remote URL
    finally:
        if owns:
            await client.aclose()
    suffix = _CONTENT_SUFFIX.get(ctype, ".jpg")
    return save_bytes(content, suffix)
