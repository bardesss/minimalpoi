from typing import Annotated

from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlmodel import Session, select

from .db import get_session
from .models import Role, User

SessionDep = Annotated[Session, Depends(get_session)]


def get_current_user(
    session: SessionDep,
    access_token: Annotated[str | None, Cookie()] = None,
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    from .security import decode_access_token

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
    payload = decode_access_token(access_token)
    if not payload or not payload.get("sub"):
        raise credentials_error
    user = session.exec(select(User).where(User.username == payload["sub"])).first()
    if not user or user.disabled:
        raise credentials_error
    # Reject tokens minted before the user's last password/role change.
    if payload.get("tv", 0) != user.token_version:
        raise credentials_error
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


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
