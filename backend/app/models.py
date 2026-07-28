from datetime import date, datetime, timezone
from enum import Enum

from sqlalchemy import JSON, Column, UniqueConstraint
from sqlmodel import Field, SQLModel, select


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
    # Bumped on password / role change to invalidate previously issued tokens
    # (their embedded `tv` no longer matches). The supported way to revoke a
    # leaked session is to reset the password.
    token_version: int = Field(default=0)
    created_at: datetime = Field(default_factory=utcnow)


class ApiToken(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True, ondelete="CASCADE")
    name: str
    # sha256 hex of the full token; the plaintext is never stored.
    token_hash: str = Field(unique=True, index=True)
    prefix: str  # non-secret display id, e.g. "ab12cd34"
    # Snapshot of User.token_version at creation; a mismatch (password/role
    # change) invalidates the token, mirroring the login cookie.
    token_version: int = Field(default=0)
    created_at: datetime = Field(default_factory=utcnow)
    last_used_at: datetime | None = Field(default=None)


class Team(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    created_by: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=utcnow)


class TeamMember(SQLModel, table=True):
    team_id: int = Field(foreign_key="team.id", primary_key=True, ondelete="CASCADE")
    user_id: int = Field(foreign_key="user.id", primary_key=True, ondelete="CASCADE")


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


class POI(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    address: str | None = Field(default=None)
    city: str | None = Field(default=None)
    country_code: str | None = Field(default=None)
    lat: float
    lng: float
    category_id: int | None = Field(default=None, foreign_key="category.id", ondelete="SET NULL")
    tags: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    notes: str | None = Field(default=None)
    phone: str | None = Field(default=None)
    email: str | None = Field(default=None)
    website: str | None = Field(default=None)
    image_url: str | None = Field(default=None)
    source_url: str | None = Field(default=None)
    created_by: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    trip_place_id: int | None = Field(default=None)
    trip_sync_status: SyncStatus = Field(default=SyncStatus.LOCAL_ONLY)
    trip_synced_snapshot: dict | None = Field(default=None, sa_column=Column(JSON))
    trip_synced_at: datetime | None = Field(default=None)
    trip_last_error: str | None = Field(default=None)


class RouteNodeKind(str, Enum):
    STAY = "stay"
    STOP = "stop"


class NodeRole(str, Enum):
    START = "start"
    END = "end"


class LegSource(str, Enum):
    GOOGLE = "google"
    ESTIMATE = "estimate"


class Route(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    start_date: date
    end_date: date | None = Field(default=None)
    round_trip: bool = Field(default=False)
    team_id: int | None = Field(default=None, foreign_key="team.id", ondelete="SET NULL")
    created_by: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class RouteNode(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    route_id: int = Field(foreign_key="route.id", index=True, ondelete="CASCADE")
    position: float  # fractional ordering key; insert between as (a+b)/2
    kind: RouteNodeKind
    role: NodeRole | None = Field(default=None)
    nights: int | None = Field(default=None)  # stays only
    day_offset: int | None = Field(default=None)  # stops only: day within base stay's span; None = departure day
    notes: str | None = Field(default=None)
    # Location: poi_id references a POI; name/lat/lng always hold a usable
    # snapshot so the node survives POI deletion.
    poi_id: int | None = Field(default=None, foreign_key="poi.id", ondelete="SET NULL")
    name: str
    lat: float
    lng: float


class RouteLeg(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    route_id: int = Field(foreign_key="route.id", index=True, ondelete="CASCADE")
    from_node_id: int = Field(foreign_key="routenode.id", ondelete="CASCADE")
    to_node_id: int = Field(foreign_key="routenode.id", ondelete="CASCADE")
    distance_m: int
    duration_s: int
    source: LegSource
    # Encoded polyline of the driving path (Google only); None for estimate legs.
    geometry: str | None = None
    computed_at: datetime = Field(default_factory=utcnow)


class RouteAttachment(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    route_id: int = Field(foreign_key="route.id", index=True, ondelete="CASCADE")
    node_id: int | None = Field(default=None, foreign_key="routenode.id", ondelete="SET NULL")
    filename: str          # original, for the download name
    stored_filename: str   # random on-disk name
    content_type: str
    size: int
    uploaded_by: int = Field(foreign_key="user.id")
    uploaded_at: datetime = Field(default_factory=utcnow)


class RouteShare(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    token: str = Field(unique=True, index=True)
    route_id: int = Field(foreign_key="route.id", unique=True, index=True, ondelete="CASCADE")
    created_by: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=utcnow)
    expires_at: datetime | None = Field(default=None)
    password_hash: str | None = Field(default=None)


class Tombstone(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    entity_type: str  # "place" | "category"
    trip_id: int      # the TRIP id of the deleted place/category
    origin: str       # "local" | "trip"
    created_at: datetime = Field(default_factory=utcnow)


class Visit(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("poi_id", "user_id", name="uq_visit_poi_user"),)
    id: int | None = Field(default=None, primary_key=True)
    poi_id: int = Field(foreign_key="poi.id", ondelete="CASCADE")
    user_id: int = Field(foreign_key="user.id", ondelete="CASCADE")
    team_id: int | None = Field(default=None, foreign_key="team.id", ondelete="SET NULL")
    rating: int | None = Field(default=None)
    created_at: datetime = Field(default_factory=utcnow)


class Comment(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    poi_id: int = Field(foreign_key="poi.id", ondelete="CASCADE")
    user_id: int = Field(foreign_key="user.id", ondelete="CASCADE")
    text: str
    created_at: datetime = Field(default_factory=utcnow)


class Settings(SQLModel, table=True):
    id: int | None = Field(default=1, primary_key=True)
    trip_base_url: str | None = Field(default=None)
    trip_username: str | None = Field(default=None)
    trip_password_enc: str | None = Field(default=None)
    trip_sync_enabled: bool = Field(default=False)
    trip_sync_interval_seconds: int = Field(default=300)
    trip_conflict_policy: str = Field(default="minimalpoi_wins")
    google_api_key_enc: str | None = Field(default=None)
    nominatim_url: str | None = Field(default="https://nominatim.openstreetmap.org")
    map_tile_url: str = Field(
        default="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
    )
    default_map_center_lat: float = Field(default=52.3676)
    default_map_center_lng: float = Field(default=4.9041)
    default_map_zoom: float = Field(default=11.0)
    # Set the `Secure` flag on the auth cookie. Default off so the app works
    # over plain HTTP on a LAN / offline; enable when running behind TLS.
    cookie_secure: bool = Field(default=False)
    # Stamp of the last completed sync run (UTC); surfaced by GET /api/sync/status.
    trip_last_sync_at: datetime | None = Field(default=None)
    # Opt-in Route module. When false, all /api/routes* endpoints 404 and the
    # client hides the Routes nav. NOT NULL with a scalar default so the
    # additive column backfill (db._add_missing_columns) can add it in place.
    routes_enabled: bool = Field(default=False)


SYNC_USERNAME = "__trip_sync__"


def sync_system_user(session) -> "User":
    user = session.exec(select(User).where(User.username == SYNC_USERNAME)).first()
    if user is None:
        user = User(username=SYNC_USERNAME, password_hash="!", role=Role.MEMBER, disabled=True)
        session.add(user)
        session.commit()
        session.refresh(user)
    return user


DELETED_USERNAME = "__deleted_user__"
SYSTEM_USERNAMES = {SYNC_USERNAME, DELETED_USERNAME}


def deleted_placeholder_user(session) -> "User":
    """The stand-in owner for content whose creator was deleted (keeps
    created_by NOT NULL and the content intact). Disabled, un-loginable —
    mirrors sync_system_user."""
    user = session.exec(select(User).where(User.username == DELETED_USERNAME)).first()
    if user is None:
        user = User(username=DELETED_USERNAME, password_hash="!", role=Role.MEMBER, disabled=True)
        session.add(user)
        session.commit()
        session.refresh(user)
    return user


def get_or_create_settings(session) -> "Settings":
    row = session.get(Settings, 1)
    if row is None:
        row = Settings(id=1)
        session.add(row)
        session.commit()
        session.refresh(row)
    return row
