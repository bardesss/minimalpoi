from fastapi import APIRouter, HTTPException, Response, status
from sqlmodel import select

from ..deps import CurrentUser, SessionDep
from ..models import POI, TeamMember, Visit
from ..schemas import VisitRead, VisitUpsert

router = APIRouter(prefix="/api/pois", tags=["visits"])


def _existing(session: SessionDep, poi_id: int, user_id: int) -> Visit | None:
    return session.exec(
        select(Visit).where(Visit.poi_id == poi_id, Visit.user_id == user_id)
    ).first()


def _assert_team_member(session: SessionDep, team_id: int | None, user_id: int) -> None:
    if team_id is None:
        return
    member = session.exec(
        select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of that team")


@router.put("/{poi_id}/visit", response_model=VisitRead)
def upsert_visit(poi_id: int, body: VisitUpsert, session: SessionDep, user: CurrentUser) -> Visit:
    if not session.get(POI, poi_id):
        raise HTTPException(status_code=404, detail="Not found")
    fields = body.model_dump(exclude_unset=True)
    visit = _existing(session, poi_id, user.id)
    if visit is None:
        team_id = fields.get("team_id", user.preferred_team_id)
        _assert_team_member(session, team_id, user.id)
        visit = Visit(
            poi_id=poi_id,
            user_id=user.id,
            team_id=team_id,
            rating=fields.get("rating"),
        )
    else:
        if "team_id" in fields:
            _assert_team_member(session, fields["team_id"], user.id)
            visit.team_id = fields["team_id"]
        if "rating" in fields:
            visit.rating = fields["rating"]
    session.add(visit)
    session.commit()
    session.refresh(visit)
    return visit


@router.get("/{poi_id}/visits", response_model=list[VisitRead])
def list_visits(poi_id: int, session: SessionDep, _: CurrentUser) -> list[Visit]:
    if not session.get(POI, poi_id):
        raise HTTPException(status_code=404, detail="Not found")
    return session.exec(select(Visit).where(Visit.poi_id == poi_id)).all()


@router.delete("/{poi_id}/visit", status_code=status.HTTP_204_NO_CONTENT)
def delete_visit(poi_id: int, session: SessionDep, user: CurrentUser) -> Response:
    visit = _existing(session, poi_id, user.id)
    if visit:
        session.delete(visit)
        session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
