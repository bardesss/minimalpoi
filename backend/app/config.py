import os
import secrets
from functools import lru_cache
from pathlib import Path


def get_data_dir() -> Path:
    d = Path(os.environ.get("MINIMALPOI_DATA_DIR", "data"))
    d.mkdir(parents=True, exist_ok=True)
    return d


@lru_cache(maxsize=1)
def get_secret_key() -> str:
    env = os.environ.get("SECRET_KEY")
    if env:
        return env
    path = get_data_dir() / "secret.key"
    if path.exists():
        return path.read_text(encoding="utf-8").strip()
    key = secrets.token_urlsafe(48)
    path.write_text(key, encoding="utf-8")
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass  # best-effort on platforms without POSIX perms
    return key


def reset_config_cache() -> None:
    get_secret_key.cache_clear()
