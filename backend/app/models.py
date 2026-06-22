from datetime import datetime, timezone
from enum import Enum

from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Role(str, Enum):
    ADMIN = "admin"
    MEMBER = "member"


class Team(SQLModel, table=True):
    """Stub Team model created in Task 5. For now, just the primary key."""
    id: int | None = Field(default=None, primary_key=True)


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    password_hash: str
    role: Role = Field(default=Role.MEMBER)
    preferred_team_id: int | None = Field(default=None, foreign_key="team.id")
    disabled: bool = Field(default=False)
    created_at: datetime = Field(default_factory=utcnow)
