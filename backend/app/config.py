import os
import secrets
from functools import lru_cache
from pathlib import Path


def get_data_dir() -> Path:
    d = Path(os.environ.get("MINIMALPOI_DATA_DIR", "data"))
    d.mkdir(parents=True, exist_ok=True)
    return d


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
