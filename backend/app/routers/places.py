from fastapi import APIRouter, HTTPException, Query, Request

from ..crypto import decrypt
from ..deps import CurrentUser, SessionDep
from ..enrich import gmaps
from ..enrich.service import enrich_place
from ..models import get_or_create_settings
from ..ratelimit import GOOGLE_LIMIT, limiter, user_or_ip
from ..schemas import PlaceSearchResult, POIDraft

router = APIRouter(prefix="/api/places", tags=["places"])


def _require_key(session) -> str:
    settings = get_or_create_settings(session)
    key = decrypt(settings.google_api_key_enc) if settings.google_api_key_enc else None
    if not key:
        raise HTTPException(status_code=400, detail="Google API key not configured")
    return key


@router.get("/search", response_model=list[PlaceSearchResult])
@limiter.limit(GOOGLE_LIMIT, key_func=user_or_ip)
async def search_places(request: Request, session: SessionDep, _: CurrentUser, q: str = Query(min_length=1)) -> list[dict]:
    key = _require_key(session)
    return await gmaps.place_search(q, key)


@router.get("/{place_id}", response_model=POIDraft)
@limiter.limit(GOOGLE_LIMIT, key_func=user_or_ip)
async def place_draft(request: Request, place_id: str, session: SessionDep, _: CurrentUser) -> POIDraft:
    # Validate the key up front so a missing key returns 400, not an empty draft.
    _require_key(session)
    return await enrich_place(place_id, session)
