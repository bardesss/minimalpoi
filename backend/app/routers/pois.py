import json

from fastapi import APIRouter, File, HTTPException, Response, UploadFile, status
from sqlmodel import select

from ..dedup import find_duplicate
from ..deps import CurrentUser, SessionDep
from ..enrich.images import localize
from ..models import POI, Category, Comment, Tombstone, Visit, Wishlist, utcnow
from ..portability import parse_csv, parse_geojson, pois_to_geojson
from ..schemas import (
    DuplicateCheck,
    DuplicateResult,
    ImportResult,
    ImportRowError,
    POICreate,
    POIRead,
    POIUpdate,
)

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


@router.post("/import", response_model=ImportResult)
async def import_pois(session: SessionDep, user: CurrentUser, file: UploadFile = File(...)) -> ImportResult:
    text = (await file.read()).decode("utf-8", errors="replace")
    name = (file.filename or "").lower()
    if name.endswith(".csv"):
        rows = parse_csv(text)
    elif name.endswith((".json", ".geojson")):
        rows = parse_geojson(text)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type (use .csv, .json, or .geojson)")

    cache: dict[str, int] = {
        c.name.strip().lower(): c.id for c in session.exec(select(Category)).all() if c.id is not None
    }
    created = 0
    skipped = 0
    errors: list[ImportRowError] = []
    new_pois: list[POI] = []

    for i, row in enumerate(rows, start=1):
        poi_name = (row.get("name") or "").strip()
        if not poi_name:
            errors.append(ImportRowError(row=i, reason="missing name"))
            continue
        try:
            lat = float(row["lat"])
            lng = float(row["lng"])
        except (TypeError, ValueError, KeyError):
            errors.append(ImportRowError(row=i, reason="invalid coordinates"))
            continue

        category_id: int | None = None
        cat_name = (row.get("category") or "").strip()
        if cat_name:
            key = cat_name.lower()
            if key in cache:
                category_id = cache[key]
            else:
                cat = Category(name=cat_name, color="#4f46e5", created_by=user.id)
                session.add(cat)
                session.flush()
                cache[key] = cat.id
                category_id = cat.id

        if find_duplicate(session, poi_name, lat, lng, row.get("source_url")):
            skipped += 1
            continue

        poi = POI(
            name=poi_name,
            address=row.get("address"),
            lat=lat,
            lng=lng,
            category_id=category_id,
            tags=row.get("tags") or [],
            notes=row.get("notes"),
            phone=row.get("phone"),
            email=row.get("email"),
            website=row.get("website"),
            image_url=row.get("image_url"),
            source_url=row.get("source_url"),
            created_by=user.id,
        )
        session.add(poi)
        session.flush()
        created += 1
        new_pois.append(poi)

    session.commit()
    return ImportResult(
        created=created,
        skipped=skipped,
        errors=errors,
        created_ids=[p.id for p in new_pois],
    )


@router.get("/export")
def export_pois(session: SessionDep, _: CurrentUser) -> Response:
    pois = session.exec(select(POI)).all()
    names = {c.id: c.name for c in session.exec(select(Category)).all() if c.id is not None}
    fc = pois_to_geojson(pois, names)
    return Response(
        content=json.dumps(fc),
        media_type="application/geo+json",
        headers={"Content-Disposition": 'attachment; filename="minimalpoi-places.geojson"'},
    )


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
