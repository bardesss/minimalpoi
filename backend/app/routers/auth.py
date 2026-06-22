from fastapi import APIRouter, HTTPException, Response, status
from sqlmodel import select

from ..deps import CurrentUser, SessionDep
from ..models import Role, User
from ..schemas import Credentials, SetupStatus, UserRead
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_NAME = "access_token"


def _set_auth_cookie(response: Response, username: str) -> None:
    response.set_cookie(
        COOKIE_NAME,
        create_access_token(username),
        httponly=True,
        samesite="lax",
        path="/",
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
    _set_auth_cookie(response, user.username)
    return user


@router.post("/login", response_model=UserRead)
def login(creds: Credentials, session: SessionDep, response: Response) -> User:
    user = session.exec(select(User).where(User.username == creds.username)).first()
    if not user or user.disabled or not verify_password(creds.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    _set_auth_cookie(response, user.username)
    return user


@router.post("/logout")
def logout(response: Response) -> dict:
    response.delete_cookie(COOKIE_NAME, path="/", samesite="lax")
    return {"status": "ok"}


@router.get("/me", response_model=UserRead)
def me(user: CurrentUser) -> User:
    return user
