import re

from fastapi import APIRouter, HTTPException, Query, Request

from ..crypto import DecryptError, decrypt
from ..deps import CurrentUser, SessionDep
from ..enrich import gmaps
from ..enrich.geocode import nominatim_lookup, nominatim_search
from ..enrich.service import enrich_place
from ..models import get_or_create_settings
from ..ratelimit import GOOGLE_LIMIT, NOMINATIM_LIMIT, limiter, user_or_ip
from ..schemas import PlaceSearchResult, POIDraft

router = APIRouter(prefix="/api/places", tags=["places"])

_OSM_ID = re.compile(r"^osm:([NWR]\d+)$")
_DEFAULT_NOMINATIM = "https://nominatim.openstreetmap.org"


def _nominatim_base(session) -> str:
    return get_or_create_settings(session).nominatim_url or _DEFAULT_NOMINATIM


def _has_google_key(session) -> bool:
    return bool(get_or_create_settings(session).google_api_key_enc)


def _require_key(session) -> str:
    settings = get_or_create_settings(session)
    if not settings.google_api_key_enc:
        raise HTTPException(status_code=400, detail="Google API key not configured")
    try:
        key = decrypt(settings.google_api_key_enc)
    except DecryptError:
        raise HTTPException(status_code=400, detail="Stored Google API key can't be decrypted — re-enter it in Settings (the secret key likely changed).")
    if not key:
        raise HTTPException(status_code=400, detail="Google API key not configured")
    return key


@router.get("/search", response_model=list[PlaceSearchResult])
@limiter.limit(GOOGLE_LIMIT, key_func=user_or_ip)
@limiter.limit(NOMINATIM_LIMIT, key_func=user_or_ip)
async def search_places(request: Request, session: SessionDep, _: CurrentUser, q: str = Query(min_length=1)) -> list[dict]:
    if _has_google_key(session):
        return await gmaps.place_search(q, _require_key(session))
    return await nominatim_search(q, _nominatim_base(session))


@router.get("/{place_id}", response_model=POIDraft)
@limiter.limit(GOOGLE_LIMIT, key_func=user_or_ip)
async def place_draft(request: Request, place_id: str, session: SessionDep, _: CurrentUser) -> POIDraft:
    if place_id.startswith("osm:"):
        m = _OSM_ID.match(place_id)
        if not m:
            raise HTTPException(status_code=422, detail="Malformed OpenStreetMap place id")
        draft = await nominatim_lookup(m.group(1), _nominatim_base(session))
        if draft is None:
            raise HTTPException(status_code=404, detail="Place not found")
        return draft

    # Validate the key up front so a missing key returns 400, not an empty draft.
    _require_key(session)
    return await enrich_place(place_id, session)
