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
