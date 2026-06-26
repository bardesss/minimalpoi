from fastapi import APIRouter, HTTPException, Response, status
from sqlmodel import select

from ..deps import CurrentUser, SessionDep
from ..models import Role, TeamMember, User, get_or_create_settings
from ..schemas import Credentials, PreferredTeamUpdate, SetupStatus, UserRead
from ..config import get_session_lifetime_days
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_NAME = "access_token"


def _set_auth_cookie(response: Response, username: str, session: SessionDep) -> None:
    secure = get_or_create_settings(session).cookie_secure
    # Set max_age so the browser keeps the cookie across restarts; without it the
    # cookie is a session cookie and is dropped when the tab/app closes (which
    # forced a re-login on every reopen, especially on mobile).
    response.set_cookie(
        COOKIE_NAME,
        create_access_token(username),
        max_age=get_session_lifetime_days() * 24 * 60 * 60,
        httponly=True,
        samesite="lax",
        path="/",
        secure=secure,
    )


def _any_user_exists(session: SessionDep) -> bool:
    return session.exec(select(User.id)).first() is not None


@router.get("/setup-status", response_model=SetupStatus)
def setup_status(session: SessionDep) -> SetupStatus:
    return SetupStatus(needs_setup=not _any_user_exists(session))


@router.post("/setup", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def setup(creds: Credentials, session: SessionDep, response: Response) -> User:
    if _any_user_exists(session):
        raise HTTPException(status_code=409, detail="Setup already completed")
    user = User(
        username=creds.username,
        password_hash=hash_password(creds.password),
        role=Role.ADMIN,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    _set_auth_cookie(response, user.username, session)
    return user


@router.post("/login", response_model=UserRead)
def login(creds: Credentials, session: SessionDep, response: Response) -> User:
    user = session.exec(select(User).where(User.username == creds.username)).first()
    if not user or user.disabled or not verify_password(creds.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    _set_auth_cookie(response, user.username, session)
    return user


@router.post("/logout")
def logout(session: SessionDep, response: Response) -> dict:
    secure = get_or_create_settings(session).cookie_secure
    response.delete_cookie(COOKIE_NAME, path="/", samesite="lax", secure=secure)
    return {"status": "ok"}


@router.get("/me", response_model=UserRead)
def me(user: CurrentUser) -> User:
    return user


@router.patch("/me/preferences", response_model=UserRead)
def update_preferences(
    body: PreferredTeamUpdate, session: SessionDep, user: CurrentUser
) -> User:
    if body.preferred_team_id is not None:
        member = session.exec(
            select(TeamMember).where(
                TeamMember.team_id == body.preferred_team_id,
                TeamMember.user_id == user.id,
            )
        ).first()
        if not member:
            raise HTTPException(status_code=403, detail="Not a member of that team")
    user.preferred_team_id = body.preferred_team_id
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
