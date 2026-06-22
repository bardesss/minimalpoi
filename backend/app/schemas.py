from datetime import datetime

from sqlmodel import Field, SQLModel

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


class POICreate(SQLModel):
    name: str
    address: str | None = None
    lat: float
    lng: float
    category_id: int | None = None
    tags: list[str] = []
    notes: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    image_url: str | None = None
    source_url: str | None = None


class POIUpdate(SQLModel):
    name: str | None = None
    address: str | None = None
    lat: float | None = None
    lng: float | None = None
    category_id: int | None = None
    tags: list[str] | None = None
    notes: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    image_url: str | None = None
    source_url: str | None = None


class POIRead(SQLModel):
    id: int
    name: str
    address: str | None
    lat: float
    lng: float
    category_id: int | None
    tags: list[str]
    notes: str | None
    phone: str | None
    email: str | None
    website: str | None
    image_url: str | None
    source_url: str | None
    created_by: int
    created_at: datetime
    updated_at: datetime
    trip_place_id: int | None
    trip_sync_status: SyncStatus


class DuplicateCheck(SQLModel):
    name: str
    lat: float | None = None
    lng: float | None = None
    source_url: str | None = None


class DuplicateResult(SQLModel):
    duplicate_id: int | None


class VisitUpsert(SQLModel):
    team_id: int | None = None
    rating: int | None = Field(default=None, ge=1, le=5)


class VisitRead(SQLModel):
    poi_id: int
    user_id: int
    team_id: int | None
    rating: int | None


class PreferredTeamUpdate(SQLModel):
    preferred_team_id: int | None = None
