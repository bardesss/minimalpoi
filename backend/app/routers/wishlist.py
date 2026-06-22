from fastapi import APIRouter, HTTPException, Response, status
from sqlmodel import select

from ..deps import CurrentUser, SessionDep
from ..models import POI, Wishlist
from ..schemas import WishlistRead

router = APIRouter(prefix="/api/pois", tags=["wishlist"])


def _existing(session: SessionDep, poi_id: int, user_id: int) -> Wishlist | None:
    return session.exec(
        select(Wishlist).where(Wishlist.poi_id == poi_id, Wishlist.user_id == user_id)
    ).first()


@router.put("/{poi_id}/wishlist", response_model=WishlistRead)
def add_wishlist(poi_id: int, session: SessionDep, user: CurrentUser) -> Wishlist:
    if not session.get(POI, poi_id):
        raise HTTPException(status_code=404, detail="Not found")
    item = _existing(session, poi_id, user.id)
    if item is None:
        item = Wishlist(poi_id=poi_id, user_id=user.id)
        session.add(item)
        session.commit()
        session.refresh(item)
    return item


@router.get("/{poi_id}/wishlist", response_model=list[WishlistRead])
def list_wishlist(poi_id: int, session: SessionDep, _: CurrentUser) -> list[Wishlist]:
    return session.exec(select(Wishlist).where(Wishlist.poi_id == poi_id)).all()


@router.delete("/{poi_id}/wishlist", status_code=status.HTTP_204_NO_CONTENT)
def remove_wishlist(poi_id: int, session: SessionDep, user: CurrentUser) -> Response:
    item = _existing(session, poi_id, user.id)
    if item:
        session.delete(item)
        session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
