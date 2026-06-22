from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Role(str, Enum):
    ADMIN = "admin"
    MEMBER = "member"


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    password_hash: str
    role: Role = Field(default=Role.MEMBER)
    preferred_team_id: int | None = Field(default=None)
    disabled: bool = Field(default=False)
    created_at: datetime = Field(default_factory=utcnow)


class Team(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    created_by: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=utcnow)


class TeamMember(SQLModel, table=True):
    team_id: int = Field(foreign_key="team.id", primary_key=True)
    user_id: int = Field(foreign_key="user.id", primary_key=True)


class SyncStatus(str, Enum):
    LOCAL_ONLY = "local_only"
    PENDING = "pending"
    SYNCED = "synced"
    CONFLICT = "conflict"
    ERROR = "error"


class Category(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    color: str = Field(default="#4f46e5")
    icon: str | None = Field(default=None)  # lucide icon name, MinimalPOI-local
    created_by: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=utcnow)

    # TRIP sync state (managed by the sync engine in Plan 3; see Task 9 POI for the parallel).
    trip_category_id: int | None = Field(default=None)
    trip_sync_status: SyncStatus = Field(default=SyncStatus.LOCAL_ONLY)
    trip_synced_snapshot: dict | None = Field(default=None, sa_column=Column(JSON))
    trip_synced_at: datetime | None = Field(default=None)
    trip_last_error: str | None = Field(default=None)
