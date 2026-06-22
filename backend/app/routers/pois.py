from fastapi import APIRouter, HTTPException, Response, status
from sqlmodel import select

from ..dedup import find_duplicate
from ..deps import CurrentUser, SessionDep
from ..models import POI, Tombstone, utcnow
from ..schemas import DuplicateCheck, DuplicateResult, POICreate, POIRead, POIUpdate

router = APIRouter(prefix="/api/pois", tags=["pois"])


@router.get("", response_model=list[POIRead])
def list_pois(session: SessionDep, _: CurrentUser) -> list[POI]:
    return session.exec(select(POI)).all()


@router.post("", response_model=POIRead, status_code=status.HTTP_201_CREATED)
def create_poi(body: POICreate, session: SessionDep, user: CurrentUser) -> POI:
    poi = POI(**body.model_dump(), created_by=user.id)
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
def update_poi(poi_id: int, body: POIUpdate, session: SessionDep, _: CurrentUser) -> POI:
    poi = session.get(POI, poi_id)
    if not poi:
        raise HTTPException(status_code=404, detail="Not found")
    for key, value in body.model_dump(exclude_unset=True).items():
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
    if poi.trip_place_id is not None:
        session.add(Tombstone(entity_type="place", trip_id=poi.trip_place_id, origin="local"))
    session.delete(poi)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
