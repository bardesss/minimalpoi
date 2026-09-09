from fastapi import APIRouter

from ..crypto import encrypt
from ..deps import AdminUser, CurrentUser, SessionDep
from ..models import Settings, get_or_create_settings
from ..schemas import MapSettingsRead, SettingsRead, SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])

# Fields whose plaintext is encrypted into a *_enc column.
SECRET_FIELDS = {"google_api_key": "google_api_key_enc"}


def _to_read(s: Settings) -> SettingsRead:
    return SettingsRead(
        google_api_key_set=bool(s.google_api_key_enc),
        nominatim_url=s.nominatim_url,
        map_tile_url=s.map_tile_url,
        default_map_center_lat=s.default_map_center_lat,
        default_map_center_lng=s.default_map_center_lng,
        default_map_zoom=s.default_map_zoom,
        cookie_secure=s.cookie_secure,
        routes_enabled=s.routes_enabled,
    )


@router.get("/map", response_model=MapSettingsRead)
def read_map_settings(session: SessionDep, _: CurrentUser) -> MapSettingsRead:
    # Map-only fields any member needs to render the map — no secrets.
    s = get_or_create_settings(session)
    return MapSettingsRead(
        map_tile_url=s.map_tile_url,
        default_map_center_lat=s.default_map_center_lat,
        default_map_center_lng=s.default_map_center_lng,
        default_map_zoom=s.default_map_zoom,
        routes_enabled=s.routes_enabled,
    )


@router.get("", response_model=SettingsRead)
def read_settings(session: SessionDep, _: AdminUser) -> SettingsRead:
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
