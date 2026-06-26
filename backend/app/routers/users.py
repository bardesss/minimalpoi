from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import func
from sqlmodel import Session, select

from ..deps import AdminUser, SessionDep
from ..models import SYNC_USERNAME, Comment, Role, TeamMember, User, Visit, Wishlist
from ..schemas import UserCreate, UserRead, UserUpdate
from ..security import hash_password

router = APIRouter(prefix="/api/users", tags=["users"])


def _admin_count(session: Session) -> int:
    return session.exec(select(func.count()).select_from(User).where(User.role == Role.ADMIN)).one()


def _guard_system(user: User) -> None:
    # The reserved TRIP-sync account owns inbound POIs; editing or deleting it
    # would orphan their attribution. It can't be logged into anyway.
    if user.username == SYNC_USERNAME:
        raise HTTPException(status_code=403, detail="The sync system account cannot be modified")


@router.get("", response_model=list[UserRead])
def list_users(session: SessionDep, _: AdminUser) -> list[User]:
    return session.exec(select(User).where(User.username != SYNC_USERNAME)).all()


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(body: UserCreate, session: SessionDep, _: AdminUser) -> User:
    if session.exec(select(User).where(User.username == body.username)).first():
        raise HTTPException(status_code=409, detail="Username taken")
    user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        role=body.role,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserRead)
def update_user(user_id: int, body: UserUpdate, session: SessionDep, _: AdminUser) -> User:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Not found")
    _guard_system(user)
    if user.role == Role.ADMIN and _admin_count(session) <= 1:
        demoting = body.role is not None and body.role != Role.ADMIN
        disabling = body.disabled is True
        if demoting or disabling:
            raise HTTPException(status_code=400, detail="Cannot remove the last admin")
    if body.password is not None:
        user.password_hash = hash_password(body.password)
    if body.role is not None:
        user.role = body.role
    if body.disabled is not None:
        user.disabled = body.disabled
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, session: SessionDep, _: AdminUser) -> Response:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Not found")
    _guard_system(user)
    if user.role == Role.ADMIN and _admin_count(session) <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the last admin")
    for model in (Visit, Wishlist, Comment):
        for row in session.exec(select(model).where(model.user_id == user_id)).all():
            session.delete(row)
    for row in session.exec(select(TeamMember).where(TeamMember.user_id == user_id)).all():
        session.delete(row)
    session.delete(user)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
