from fastapi import APIRouter, HTTPException, Response, status
from sqlmodel import select

from ..deps import CurrentUser, SessionDep
from ..models import Team, TeamMember
from ..schemas import TeamCreate, TeamRead

router = APIRouter(prefix="/api/teams", tags=["teams"])


def _member_ids(session: SessionDep, team_id: int) -> list[int]:
    rows = session.exec(select(TeamMember).where(TeamMember.team_id == team_id)).all()
    return [r.user_id for r in rows]


def _to_read(session: SessionDep, team: Team) -> TeamRead:
    return TeamRead(
        id=team.id,
        name=team.name,
        created_by=team.created_by,
        member_ids=_member_ids(session, team.id),
    )


def _set_members(session: SessionDep, team_id: int, member_ids: list[int]) -> None:
    for row in session.exec(select(TeamMember).where(TeamMember.team_id == team_id)).all():
        session.delete(row)
    for uid in set(member_ids):
        session.add(TeamMember(team_id=team_id, user_id=uid))


@router.get("", response_model=list[TeamRead])
def list_teams(session: SessionDep, _: CurrentUser) -> list[TeamRead]:
    teams = session.exec(select(Team)).all()
    return [_to_read(session, t) for t in teams]


@router.post("", response_model=TeamRead, status_code=status.HTTP_201_CREATED)
def create_team(body: TeamCreate, session: SessionDep, user: CurrentUser) -> TeamRead:
    team = Team(name=body.name, created_by=user.id)
    session.add(team)
    session.commit()
    session.refresh(team)
    _set_members(session, team.id, body.member_ids)
    session.commit()
    return _to_read(session, team)


@router.patch("/{team_id}", response_model=TeamRead)
def update_team(team_id: int, body: TeamCreate, session: SessionDep, _: CurrentUser) -> TeamRead:
    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Not found")
    team.name = body.name
    session.add(team)
    _set_members(session, team_id, body.member_ids)
    session.commit()
    session.refresh(team)
    return _to_read(session, team)


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team(team_id: int, session: SessionDep, _: CurrentUser) -> Response:
    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Not found")
    for row in session.exec(select(TeamMember).where(TeamMember.team_id == team_id)).all():
        session.delete(row)
    session.delete(team)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
