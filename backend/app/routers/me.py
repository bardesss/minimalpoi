from fastapi import APIRouter
from sqlmodel import select

from ..deps import CurrentUser, SessionDep
from ..models import Visit
from ..schemas import VisitRead

router = APIRouter(prefix="/api/me", tags=["me"])


@router.get("/visits", response_model=list[VisitRead])
def my_visits(session: SessionDep, user: CurrentUser) -> list[Visit]:
    return session.exec(select(Visit).where(Visit.user_id == user.id)).all()
