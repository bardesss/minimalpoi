import secrets
from pathlib import Path

import httpx

from ..config import get_data_dir

_CONTENT_SUFFIX = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}


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
        client = httpx.AsyncClient(follow_redirects=True, timeout=10.0)
    try:
        resp = await client.get(image_url)
        resp.raise_for_status()
        content = resp.content
        ctype = resp.headers.get("content-type", "").split(";")[0].strip()
    except httpx.HTTPError:
        return image_url  # non-fatal: keep the remote URL
    finally:
        if owns:
            await client.aclose()
    suffix = _CONTENT_SUFFIX.get(ctype, ".jpg")
    return save_bytes(content, suffix)
