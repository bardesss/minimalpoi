from fastapi import APIRouter, HTTPException, Response, status
from sqlmodel import select

from ..deps import CurrentUser, SessionDep
from ..models import POI, Visit
from ..schemas import VisitRead, VisitUpsert

router = APIRouter(prefix="/api/pois", tags=["visits"])


def _existing(session: SessionDep, poi_id: int, user_id: int) -> Visit | None:
    return session.exec(
        select(Visit).where(Visit.poi_id == poi_id, Visit.user_id == user_id)
    ).first()


@router.put("/{poi_id}/visit", response_model=VisitRead)
def upsert_visit(poi_id: int, body: VisitUpsert, session: SessionDep, user: CurrentUser) -> Visit:
    if not session.get(POI, poi_id):
        raise HTTPException(status_code=404, detail="Not found")
    fields = body.model_dump(exclude_unset=True)
    visit = _existing(session, poi_id, user.id)
    if visit is None:
        visit = Visit(
            poi_id=poi_id,
            user_id=user.id,
            team_id=fields.get("team_id", user.preferred_team_id),
            rating=fields.get("rating"),
        )
    else:
        if "team_id" in fields:
            visit.team_id = fields["team_id"]
        if "rating" in fields:
            visit.rating = fields["rating"]
    session.add(visit)
    session.commit()
    session.refresh(visit)
    return visit


@router.get("/{poi_id}/visits", response_model=list[VisitRead])
def list_visits(poi_id: int, session: SessionDep, _: CurrentUser) -> list[Visit]:
    return session.exec(select(Visit).where(Visit.poi_id == poi_id)).all()


@router.delete("/{poi_id}/visit", status_code=status.HTTP_204_NO_CONTENT)
def delete_visit(poi_id: int, session: SessionDep, user: CurrentUser) -> Response:
    visit = _existing(session, poi_id, user.id)
    if visit:
        session.delete(visit)
        session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
