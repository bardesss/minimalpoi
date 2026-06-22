from fastapi import APIRouter, HTTPException, Response, status
from sqlmodel import select

from ..dedup import find_duplicate
from ..deps import CurrentUser, SessionDep
from ..enrich.images import localize
from ..models import POI, Comment, Tombstone, Visit, Wishlist, utcnow
from ..schemas import DuplicateCheck, DuplicateResult, POICreate, POIRead, POIUpdate

router = APIRouter(prefix="/api/pois", tags=["pois"])


@router.get("", response_model=list[POIRead])
def list_pois(session: SessionDep, _: CurrentUser) -> list[POI]:
    return session.exec(select(POI)).all()


@router.post("", response_model=POIRead, status_code=status.HTTP_201_CREATED)
async def create_poi(body: POICreate, session: SessionDep, user: CurrentUser) -> POI:
    data = body.model_dump()
    data["image_url"] = await localize(data.get("image_url"))
    poi = POI(**data, created_by=user.id)
    session.add(poi)
    session.commit()
    session.refresh(poi)
    return poi


@router.post("/check-duplicate", response_model=DuplicateResult)
def check_duplicate(body: DuplicateCheck, session: SessionDep, _: CurrentUser) -> DuplicateResult:
    dup = find_duplicate(session, body.name, body.lat, body.lng, body.source_url)
    return DuplicateResult(duplicate_id=dup.id if dup else None)


@router.get("/{poi_id}", response_model=POIRead)
def get_poi(poi_id: int, session: SessionDep, _: CurrentUser) -> POI:
    poi = session.get(POI, poi_id)
    if not poi:
        raise HTTPException(status_code=404, detail="Not found")
    return poi


@router.patch("/{poi_id}", response_model=POIRead)
async def update_poi(poi_id: int, body: POIUpdate, session: SessionDep, _: CurrentUser) -> POI:
    poi = session.get(POI, poi_id)
    if not poi:
        raise HTTPException(status_code=404, detail="Not found")
    data = body.model_dump(exclude_unset=True)
    if "image_url" in data:
        data["image_url"] = await localize(data["image_url"])
    for key, value in data.items():
        setattr(poi, key, value)
    poi.updated_at = utcnow()
    session.add(poi)
    session.commit()
    session.refresh(poi)
    return poi


@router.delete("/{poi_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_poi(poi_id: int, session: SessionDep, _: CurrentUser) -> Response:
    poi = session.get(POI, poi_id)
    if not poi:
        raise HTTPException(status_code=404, detail="Not found")
    for model in (Visit, Wishlist, Comment):
        for row in session.exec(select(model).where(model.poi_id == poi_id)).all():
            session.delete(row)
    if poi.trip_place_id is not None:
        session.add(Tombstone(entity_type="place", trip_id=poi.trip_place_id, origin="local"))
    session.delete(poi)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
