from fastapi import APIRouter

from ..deps import CurrentUser, SessionDep
from ..enrich.service import enrich
from ..schemas import EnrichRequest, POIDraft

router = APIRouter(prefix="/api/enrich", tags=["enrich"])


@router.post("", response_model=POIDraft)
async def enrich_url(body: EnrichRequest, session: SessionDep, _: CurrentUser) -> POIDraft:
    return await enrich(body.url, session)
