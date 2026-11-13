from datetime import timezone
from typing import Annotated

from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlmodel import Session, select

from . import db
from .db import get_session
from .models import Role, TeamMember, User

SessionDep = Annotated[Session, Depends(get_session)]


def user_from_access_token(session: Session, token: str) -> User | None:
    """Resolve a login-cookie JWT to its active user, or None if it must be
    rejected. The single source of truth for cookie authentication.

    Rejects: a bad signature or expired token; a non-integer `sub` (including
    legacy username-based tokens); a missing or disabled user; a `tv` or `sv`
    that no longer matches (password/role change, disable, logout); and a
    token issued before the account was created (SQLite can reuse a deleted
    user's id). `iat` and `created_at` are both floored to whole seconds so a
    token minted in the account's creation second stays valid.
    """
    from .security import decode_access_token

    payload = decode_access_token(token)
    if not payload:
        return None
    sub = payload.get("sub")
    iat = payload.get("iat")
    if not (isinstance(sub, str) and sub.isascii() and sub.isdigit()) or not isinstance(iat, int):
        return None
    user = session.get(User, int(sub))
    if user is None or user.disabled:
        return None
    if payload.get("tv") != user.token_version or payload.get("sv") != user.session_version:
        return None
    created_at = user.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    if iat < int(created_at.timestamp()):
        return None
    return user


def _authenticate(
    session: Session, access_token: str | None, authorization: str | None
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
    )

    # Programmatic clients (e.g. the MCP server) present a per-user API token as
    # a Bearer header instead of the browser login cookie.
    # The bearer path is intentionally exclusive: a present-but-invalid bearer
    # 401s here rather than falling back to the cookie.
    if authorization and authorization.lower().startswith("bearer "):
        from .apitokens import resolve_api_token
        user = resolve_api_token(session, authorization[7:].strip())
        if user is not None:
            return user
        raise credentials_error

    if not access_token:
        raise credentials_error
    user = user_from_access_token(session, access_token)
    if user is None:
        raise credentials_error
    return user


def get_current_user(
    session: SessionDep,
    access_token: Annotated[str | None, Cookie()] = None,
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    return _authenticate(session, access_token, authorization)


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_current_user_no_session(
    access_token: Annotated[str | None, Cookie()] = None,
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    """get_current_user for long-lived responses (SSE). Authenticates in its own
    short session and returns a detached User, so no pooled connection stays
    checked out for the life of the stream (a SessionDep's teardown only runs
    once the response finishes)."""
    # expire_on_commit=False: the bearer path commits last_used_at, which would
    # otherwise expire the user's attributes before it is detached.
    with Session(db.engine, expire_on_commit=False) as session:
        user = _authenticate(session, access_token, authorization)
        session.expunge(user)
    return user


CurrentUserNoSession = Annotated[User, Depends(get_current_user_no_session)]


def get_cookie_user(
    session: SessionDep,
    access_token: Annotated[str | None, Cookie()] = None,
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    """Like get_current_user, but only for the browser login cookie. A request
    carrying a Bearer header is refused outright, so a leaked API token can't
    manage (e.g. mint) tokens."""
    if authorization and authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API tokens cannot manage API tokens",
        )
    user = user_from_access_token(session, access_token) if access_token else None
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


CookieUser = Annotated[User, Depends(get_cookie_user)]


def require_admin(user: CurrentUser) -> User:
    if user.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return user


AdminUser = Annotated[User, Depends(require_admin)]


def require_owner_or_admin(created_by: int, user: User) -> None:
    """Allow the creator or an admin; 403 otherwise. Used for edits/deletes of
    shared entities (POIs, categories) so one member can't mutate another's."""
    if created_by != user.id and user.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")


def is_team_member(session: Session, team_id: int, user_id: int) -> bool:
    return session.exec(
        select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
    ).first() is not None


def require_team_member(session: Session, team_id: int | None, user_id: int) -> None:
    """No-op when team_id is None; else 403 unless the user belongs to the team."""
    if team_id is None:
        return
    if not is_team_member(session, team_id, user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of that team")
