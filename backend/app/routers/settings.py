from fastapi import APIRouter

from ..crypto import encrypt
from ..deps import AdminUser, CurrentUser, SessionDep
from ..models import Settings, get_or_create_settings
from ..schemas import SettingsRead, SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])

# Fields whose plaintext is encrypted into a *_enc column.
SECRET_FIELDS = {"trip_password": "trip_password_enc", "google_api_key": "google_api_key_enc"}


def _to_read(s: Settings) -> SettingsRead:
    return SettingsRead(
        trip_base_url=s.trip_base_url,
        trip_username=s.trip_username,
        trip_password_set=bool(s.trip_password_enc),
        trip_sync_enabled=s.trip_sync_enabled,
        trip_sync_interval_seconds=s.trip_sync_interval_seconds,
        trip_conflict_policy=s.trip_conflict_policy,
        google_api_key_set=bool(s.google_api_key_enc),
        nominatim_url=s.nominatim_url,
        map_tile_url=s.map_tile_url,
        default_map_center_lat=s.default_map_center_lat,
        default_map_center_lng=s.default_map_center_lng,
        default_map_zoom=s.default_map_zoom,
        cookie_secure=s.cookie_secure,
    )


@router.get("", response_model=SettingsRead)
def read_settings(session: SessionDep, _: CurrentUser) -> SettingsRead:
    return _to_read(get_or_create_settings(session))


@router.patch("", response_model=SettingsRead)
def update_settings(body: SettingsUpdate, session: SessionDep, _: AdminUser) -> SettingsRead:
    s = get_or_create_settings(session)
    data = body.model_dump(exclude_unset=True)
    for plain_field, enc_field in SECRET_FIELDS.items():
        if plain_field in data:
            value = data.pop(plain_field)
            setattr(s, enc_field, encrypt(value) if value else None)
    for key, value in data.items():
        setattr(s, key, value)
    session.add(s)
    session.commit()
    session.refresh(s)
    return _to_read(s)
