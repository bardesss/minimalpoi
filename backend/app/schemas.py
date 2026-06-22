from datetime import datetime

from sqlmodel import SQLModel

from .models import Role


class SetupStatus(SQLModel):
    needs_setup: bool


class Credentials(SQLModel):
    username: str
    password: str


class UserRead(SQLModel):
    id: int
    username: str
    role: Role
    preferred_team_id: int | None
    disabled: bool
    created_at: datetime


class UserCreate(SQLModel):
    username: str
    password: str
    role: Role = Role.MEMBER


class UserUpdate(SQLModel):
    password: str | None = None
    role: Role | None = None
    disabled: bool | None = None


class TeamCreate(SQLModel):
    name: str
    member_ids: list[int] = []


class TeamRead(SQLModel):
    id: int
    name: str
    created_by: int
    member_ids: list[int] = []
