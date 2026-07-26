import hashlib
import secrets

from sqlmodel import Session, select

from .models import ApiToken, User, utcnow

TOKEN_PREFIX = "mpoi"


def hash_api_token(full: str) -> str:
    return hashlib.sha256(full.encode("utf-8")).hexdigest()


def generate_api_token() -> tuple[str, str, str]:
    """Return (full_token, prefix, token_hash). Only prefix + hash are stored."""
    prefix = secrets.token_hex(4)          # 8 chars, non-secret display id
    secret = secrets.token_urlsafe(32)     # high-entropy secret
    full = f"{TOKEN_PREFIX}_{prefix}_{secret}"
    return full, prefix, hash_api_token(full)


def resolve_api_token(session: Session, full: str) -> User | None:
    """Validate a presented token; return the owning user or None. Touches
    last_used_at on success."""
    if not full.startswith(f"{TOKEN_PREFIX}_"):
        return None
    row = session.exec(
        select(ApiToken).where(ApiToken.token_hash == hash_api_token(full))
    ).first()
    if row is None:
        return None
    user = session.get(User, row.user_id)
    if user is None or user.disabled:
        return None
    if row.token_version != user.token_version:
        return None
    row.last_used_at = utcnow()
    session.add(row)
    session.commit()
    return user
