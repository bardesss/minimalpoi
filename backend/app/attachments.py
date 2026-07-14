import secrets
from pathlib import Path

from .config import get_data_dir

MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

# Allowed types for tickets/confirmations, keyed by canonical MIME → extension.
ALLOWED = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}


def sniff(data: bytes) -> str | None:
    """Return the allowed MIME inferred from magic bytes, else None. Never trust
    the client-supplied content-type."""
    if data.startswith(b"%PDF-"):
        return "application/pdf"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def attachments_dir() -> Path:
    d = get_data_dir() / "attachments"
    d.mkdir(parents=True, exist_ok=True)
    return d


def save(data: bytes, ext: str) -> str:
    name = secrets.token_hex(16) + ext
    (attachments_dir() / name).write_bytes(data)
    return name


def remove(stored_filename: str) -> None:
    path = attachments_dir() / stored_filename
    # Guard against path traversal in a stored name.
    if attachments_dir().resolve() in path.resolve().parents:
        path.unlink(missing_ok=True)
