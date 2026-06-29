from fastapi import APIRouter, Request

from ..deps import CurrentUser, SessionDep
from ..enrich.service import enrich
from ..ratelimit import ENRICH_LIMIT, limiter, user_or_ip
from ..schemas import EnrichRequest, POIDraft

router = APIRouter(prefix="/api/enrich", tags=["enrich"])


@router.post("", response_model=POIDraft)
@limiter.limit(ENRICH_LIMIT, key_func=user_or_ip)
async def enrich_url(request: Request, body: EnrichRequest, session: SessionDep, _: CurrentUser) -> POIDraft:
    return await enrich(body.url, session)
