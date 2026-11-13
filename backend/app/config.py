import os
import secrets
from functools import lru_cache
from pathlib import Path


@lru_cache(maxsize=None)
def _ensure_data_dir(path_str: str) -> Path:
    # mkdir once per distinct path; keyed on the path string so a test that
    # repoints MINIMALPOI_DATA_DIR (via reset_config_cache) still gets a fresh dir.
    d = Path(path_str)
    d.mkdir(parents=True, exist_ok=True)
    return d


def get_data_dir() -> Path:
    return _ensure_data_dir(os.environ.get("MINIMALPOI_DATA_DIR", "data"))


DEFAULT_SESSION_LIFETIME_DAYS = 30


def get_session_lifetime_days() -> int:
    """How long a login stays valid, for both the JWT and its cookie.

    Configurable via SESSION_LIFETIME_DAYS; falls back to the default for any
    missing or non-positive value. Read fresh each call so it can be changed
    without a restart (and overridden per-test).
    """
    raw = os.environ.get("SESSION_LIFETIME_DAYS")
    if raw is None:
        return DEFAULT_SESSION_LIFETIME_DAYS
    try:
        days = int(raw)
    except ValueError:
        return DEFAULT_SESSION_LIFETIME_DAYS
    return days if days > 0 else DEFAULT_SESSION_LIFETIME_DAYS


DEFAULT_MAX_BODY_MB = 50


def max_body_bytes() -> int:
    """Request-body cap for every route except backup restore (MAX_BODY_MB, MiB).

    Read fresh each call. Missing, non-numeric or non-positive values fall back
    to the default.
    """
    raw = os.environ.get("MAX_BODY_MB")
    try:
        mb = int(raw) if raw is not None else DEFAULT_MAX_BODY_MB
    except ValueError:
        mb = DEFAULT_MAX_BODY_MB
    if mb <= 0:
        mb = DEFAULT_MAX_BODY_MB
    return mb * 1024 * 1024


DEFAULT_RESTORE_MAX_BYTES = 500 * 1024 * 1024


def restore_max_bytes() -> int:
    """Size cap for a backup archive (RESTORE_MAX_BYTES, bytes): the restore
    upload body, the archive's total uncompressed size on restore (zip-bomb
    guard), and the largest backup /api/backup will produce. Read fresh each
    call; missing, non-numeric or non-positive values fall back to 500 MiB."""
    raw = os.environ.get("RESTORE_MAX_BYTES")
    try:
        value = int(raw) if raw is not None else DEFAULT_RESTORE_MAX_BYTES
    except ValueError:
        return DEFAULT_RESTORE_MAX_BYTES
    return value if value > 0 else DEFAULT_RESTORE_MAX_BYTES


def restore_limit_message(what: str) -> str:
    limit = restore_max_bytes()
    mib = 1024 * 1024
    shown = f"{limit // mib} MiB" if limit % mib == 0 else f"{limit} bytes"
    return f"{what} exceeds the backup size limit of {shown}. Raise RESTORE_MAX_BYTES to allow it."


def nominatim_allow_private() -> bool:
    """NOMINATIM_ALLOW_PRIVATE=1 lets the configured Nominatim host resolve to a
    private/LAN address (self-hosted Nominatim). Read fresh each call."""
    return os.environ.get("NOMINATIM_ALLOW_PRIVATE", "").strip().lower() in ("1", "true", "yes")


@lru_cache(maxsize=1)
def get_secret_key() -> str:
    env = os.environ.get("SECRET_KEY")
    if env:
        return env
    path = get_data_dir() / "secret.key"
    if path.exists():
        return path.read_text(encoding="utf-8").strip()
    key = secrets.token_urlsafe(48)
    # Create atomically (O_CREAT|O_EXCL): under multiple workers two processes
    # could otherwise both generate and clobber the file, splitting the key and
    # making already-encrypted data undecryptable. The loser re-reads the winner's.
    try:
        fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError:
        return path.read_text(encoding="utf-8").strip()
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(key)
    return key


def reset_config_cache() -> None:
    get_secret_key.cache_clear()
    _ensure_data_dir.cache_clear()
