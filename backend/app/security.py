from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

import bcrypt
import jwt

from .config import get_secret_key, get_session_lifetime_days

if TYPE_CHECKING:
    from .models import User

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    raw = password.encode("utf-8")
    if len(raw) > 72:
        # bcrypt rejects >72 bytes (ValueError on newer versions); nothing that
        # long can match a stored hash. Still spend the bcrypt time.
        return verify_password_dummy()
    try:
        return bcrypt.checkpw(raw, password_hash.encode("utf-8"))
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


def create_access_token(user: "User", expires_minutes: int | None = None) -> str:
    """Mint the login-cookie JWT for `user`.

    `sub` is the user id (not the username, so a re-created account never
    inherits an old cookie); `tv` / `sv` snapshot the user's token and session
    versions so a password/role change, disable or logout revokes it; `iat`
    (whole seconds) lets get_current_user reject a token minted before the
    account existed, in case SQLite reused a deleted user's id.
    """
    if expires_minutes is None:
        expires_minutes = get_session_lifetime_days() * 24 * 60
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "tv": user.token_version,
        "sv": user.session_version,
        "iat": int(now.timestamp()),
        "exp": now + timedelta(minutes=expires_minutes),
    }
    return jwt.encode(payload, get_secret_key(), algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """Return the decoded JWT payload, or None if the signature or expiry is invalid."""
    try:
        return jwt.decode(token, get_secret_key(), algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
