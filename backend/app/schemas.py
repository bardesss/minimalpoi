from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import StringConstraints
from sqlmodel import Field, SQLModel

from .models import LegSource, Role, RouteNodeKind, SyncStatus


class StatusResponse(SQLModel):
    status: str


class VersionInfo(SQLModel):
    current: str
    latest: str | None
    update_available: bool


class ImageUploadResult(SQLModel):
    url: str


class RestoreResult(SQLModel):
    restored: dict[str, int]


class SyncRunResult(SQLModel):
    ran: bool
    errors: int = 0

# Username is trimmed and must be non-blank. Password has a floor (basic
# strength) and a 72-char ceiling so bcrypt's 72-byte truncation can't silently
# drop characters. These apply when *setting* credentials, not when logging in.
Username = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64)]
Password = Annotated[str, StringConstraints(min_length=8, max_length=72)]


class SetupStatus(SQLModel):
    needs_setup: bool


class Credentials(SQLModel):
    # Login: accept anything and answer 401 on mismatch (no policy leak).
    username: str
    password: str


class Signup(SQLModel):
    username: Username
    password: Password


class UserRead(SQLModel):
    id: int
    username: str
    role: Role
    preferred_team_id: int | None
    disabled: bool
    created_at: datetime


class UserCreate(SQLModel):
    username: Username
    password: Password
    role: Role = Role.MEMBER


class UserUpdate(SQLModel):
    password: Password | None = None
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
    city: str | None = None
    country_code: str | None = None
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
    city: str | None = None
    country_code: str | None = None
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
    city: str | None
    country_code: str | None
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
    # Aggregated across all users' visits; populated by the list endpoint only.
    avg_rating: float | None = None
    rating_count: int = 0


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


class CommentCreate(SQLModel):
    text: str


class CommentUpdate(SQLModel):
    text: str


class CommentRead(SQLModel):
    id: int
    poi_id: int
    user_id: int
    username: str
    text: str
    created_at: datetime


class MapSettingsRead(SQLModel):
    """Public, map-only view — safe for any logged-in member (no TRIP/secret fields)."""
    map_tile_url: str
    default_map_center_lat: float
    default_map_center_lng: float
    default_map_zoom: float
    routes_enabled: bool


class SettingsRead(SQLModel):
    trip_base_url: str | None
    trip_username: str | None
    trip_password_set: bool
    trip_sync_enabled: bool
    trip_sync_interval_seconds: int
    trip_conflict_policy: str
    google_api_key_set: bool
    nominatim_url: str | None
    map_tile_url: str
    default_map_center_lat: float
    default_map_center_lng: float
    default_map_zoom: float
    cookie_secure: bool
    trip_last_sync_at: datetime | None
    routes_enabled: bool


class SettingsUpdate(SQLModel):
    trip_base_url: str | None = None
    trip_username: str | None = None
    trip_password: str | None = None
    trip_sync_enabled: bool | None = None
    trip_sync_interval_seconds: int | None = None
    trip_conflict_policy: str | None = None
    google_api_key: str | None = None
    nominatim_url: str | None = None
    map_tile_url: str | None = None
    default_map_center_lat: float | None = None
    default_map_center_lng: float | None = None
    default_map_zoom: float | None = None
    cookie_secure: bool | None = None
    routes_enabled: bool | None = None


class SyncStatusRead(SQLModel):
    enabled: bool
    last_run: datetime | None
    error_count: int
    conflict_count: int


class SyncConflictRead(SQLModel):
    entity_type: str  # "place" | "category"
    id: int
    name: str
    trip_id: int | None
    status: str       # "conflict" | "error"
    last_error: str | None


class SyncResolve(SQLModel):
    entity_type: Literal["place", "category"]
    id: int
    resolution: Literal["local", "trip"]


class EnrichRequest(SQLModel):
    url: str


class PlaceSearchResult(SQLModel):
    place_id: str
    name: str
    address: str | None = None
    lat: float | None = None
    lng: float | None = None


class POIDraft(SQLModel):
    name: str | None = None
    address: str | None = None
    city: str | None = None
    country_code: str | None = None
    lat: float | None = None
    lng: float | None = None
    image_url: str | None = None
    description: str | None = None
    phone: str | None = None
    website: str | None = None
    source_url: str | None = None
    field_sources: dict[str, str] = Field(default_factory=dict)


class ImportRowError(SQLModel):
    row: int
    reason: str


class ImportResult(SQLModel):
    created: int
    skipped: int
    errors: list[ImportRowError] = []
    created_ids: list[int] = []


class TagInfo(SQLModel):
    tag: str
    count: int


class TagRename(SQLModel):
    old: str
    new: str


class TeamCandidate(SQLModel):
    id: int
    username: str


class RouteCreate(SQLModel):
    name: str
    start_date: date


class RouteUpdate(SQLModel):
    name: str | None = None
    start_date: date | None = None


class RouteSummary(SQLModel):
    id: int
    name: str
    start_date: date
    end_date: date
    node_count: int
    created_by: int
    owner_username: str


class RouteNodeRead(SQLModel):
    id: int
    kind: RouteNodeKind
    position: float
    nights: int | None
    notes: str | None
    poi_id: int | None
    name: str
    lat: float
    lng: float
    arrive_date: date | None = None
    depart_date: date | None = None
    inbound_distance_m: int | None = None
    inbound_duration_s: int | None = None


class RouteLegRead(SQLModel):
    from_node_id: int
    to_node_id: int
    distance_m: int
    duration_s: int
    source: LegSource


class RouteNodeCreate(SQLModel):
    kind: RouteNodeKind
    poi_id: int | None = None
    name: str | None = None
    lat: float | None = None
    lng: float | None = None
    nights: int | None = None
    notes: str | None = None
    position: float | None = None


class RouteNodeUpdate(SQLModel):
    nights: int | None = None
    notes: str | None = None
    position: float | None = None


class RouteDetail(RouteSummary):
    nodes: list[RouteNodeRead] = []
    legs: list[RouteLegRead] = []
    total_distance_m: int = 0
    total_duration_s: int = 0
