from datetime import datetime

from sqlmodel import SQLModel

from .models import Role, SyncStatus


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


class CategoryCreate(SQLModel):
    name: str
    color: str = "#4f46e5"
    icon: str | None = None


class CategoryUpdate(SQLModel):
    name: str | None = None
    color: str | None = None
    icon: str | None = None


class CategoryRead(SQLModel):
    id: int
    name: str
    color: str
    icon: str | None
    created_by: int
    trip_category_id: int | None
    trip_sync_status: SyncStatus
