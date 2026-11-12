from fastapi import APIRouter, HTTPException, Request, Response, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlmodel import select

from ..deps import CurrentUser, SessionDep, require_team_member, user_from_access_token
from ..models import SYSTEM_USERNAMES, Role, User, get_or_create_settings
from ..ratelimit import LOGIN_LIMIT, SETUP_LIMIT, limiter
from ..schemas import Credentials, PreferredTeamUpdate, SetupStatus, Signup, StatusResponse, UserRead
from ..config import get_session_lifetime_days
from ..security import create_access_token, hash_password, verify_password, verify_password_dummy

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_NAME = "access_token"


def _is_https(request: Request) -> bool:
    """True when the request reached us over TLS, directly or via a trusted proxy."""
    if request.url.scheme == "https":
        return True
    return request.headers.get("x-forwarded-proto", "").split(",")[0].strip().lower() == "https"


def _cookie_secure(request: Request, session: SessionDep) -> bool:
    # Auto-enable Secure on HTTPS (so an exposed instance never sends the token
    # in cleartext); the setting is an explicit override for plain-HTTP LAN use.
    return get_or_create_settings(session).cookie_secure or _is_https(request)


def _set_auth_cookie(response: Response, request: Request, user: User, session: SessionDep) -> None:
    # Set max_age so the browser keeps the cookie across restarts; without it the
    # cookie is a session cookie and is dropped when the tab/app closes (which
    # forced a re-login on every reopen, especially on mobile).
    response.set_cookie(
        COOKIE_NAME,
        create_access_token(user),
        max_age=get_session_lifetime_days() * 24 * 60 * 60,
        httponly=True,
        samesite="lax",
        path="/",
        secure=_cookie_secure(request, session),
    )


def _any_user_exists(session: SessionDep) -> bool:
    return session.exec(select(User.id).where(User.username.not_in(SYSTEM_USERNAMES))).first() is not None


@router.get("/setup-status", response_model=SetupStatus)
@limiter.limit(SETUP_LIMIT)
def setup_status(request: Request, session: SessionDep) -> SetupStatus:
    return SetupStatus(needs_setup=not _any_user_exists(session))


@router.post("/setup", response_model=UserRead, status_code=status.HTTP_201_CREATED)
@limiter.limit(SETUP_LIMIT)
def setup(request: Request, creds: Signup, session: SessionDep, response: Response) -> User:
    if _any_user_exists(session):
        raise HTTPException(status_code=409, detail="Setup already completed")
    if creds.username.lower() in {u.lower() for u in SYSTEM_USERNAMES}:
        raise HTTPException(status_code=400, detail="That username is reserved")
    user = User(
        username=creds.username,
        password_hash=hash_password(creds.password),
        role=Role.ADMIN,
    )
    session.add(user)
    try:
        session.flush()
        # Re-check inside the transaction: two concurrent setups can both pass
        # the pre-check above, so only the first one to get here may commit.
        count = session.exec(
            select(func.count()).select_from(User).where(User.username.not_in(SYSTEM_USERNAMES))
        ).one()
        if count > 1:
            session.rollback()
            raise HTTPException(status_code=409, detail="Setup already completed")
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=409, detail="Setup already completed")
    session.refresh(user)
    _set_auth_cookie(response, request, user, session)
    return user


@router.post("/login", response_model=UserRead)
@limiter.limit(LOGIN_LIMIT)
def login(request: Request, creds: Credentials, session: SessionDep, response: Response) -> User:
    user = session.exec(select(User).where(User.username == creds.username)).first()
    # Always spend bcrypt time, even when the user is missing, so a wrong
    # username and a wrong password are indistinguishable by response timing.
    password_ok = verify_password(creds.password, user.password_hash) if user else verify_password_dummy()
    if not user or user.disabled or not password_ok:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    _set_auth_cookie(response, request, user, session)
    return user


@router.post("/logout", response_model=StatusResponse)
def logout(request: Request, session: SessionDep, response: Response) -> dict:
    # Revoke server-side, not just in this browser: bumping session_version
    # invalidates every login cookie this user holds (all devices). API tokens
    # don't carry it and stay valid. An absent or already-invalid cookie just
    # gets cleared.
    token = request.cookies.get(COOKIE_NAME)
    user = user_from_access_token(session, token) if token else None
    if user is not None:
        user.session_version += 1
        session.add(user)
        session.commit()
    response.delete_cookie(COOKIE_NAME, path="/", samesite="lax", secure=_cookie_secure(request, session))
    return {"status": "ok"}


@router.get("/me", response_model=UserRead)
def me(user: CurrentUser) -> User:
    return user


@router.patch("/me/preferences", response_model=UserRead)
def update_preferences(
    body: PreferredTeamUpdate, session: SessionDep, user: CurrentUser
) -> User:
    require_team_member(session, body.preferred_team_id, user.id)
    user.preferred_team_id = body.preferred_team_id
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
