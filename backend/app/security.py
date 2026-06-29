from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from .config import get_secret_key, get_session_lifetime_days

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


# A precomputed hash used to spend the same bcrypt time when the username
# doesn't exist, so a missing user can't be told apart from a wrong password by
# response timing (username enumeration).
_DUMMY_HASH = hash_password("minimalpoi-timing-equalizer").encode("utf-8")


def verify_password_dummy() -> bool:
    """Run a throwaway bcrypt comparison to equalize timing; always False."""
    bcrypt.checkpw(b"x", _DUMMY_HASH)
    return False


def create_access_token(username: str, expires_minutes: int | None = None) -> str:
    if expires_minutes is None:
        expires_minutes = get_session_lifetime_days() * 24 * 60
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    payload = {"sub": username, "exp": expire}
    return jwt.encode(payload, get_secret_key(), algorithm=ALGORITHM)


def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, get_secret_key(), algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
    return payload.get("sub")
