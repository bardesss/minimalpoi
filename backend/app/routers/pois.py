import json

from fastapi import APIRouter, File, HTTPException, Request, Response, UploadFile, status
from pydantic import ValidationError
from sqlalchemy import func
from sqlmodel import select

from ..dedup import find_duplicate
from ..deps import CurrentUser, SessionDep, require_owner_or_admin
from ..enrich.images import localize
from ..ratelimit import ENRICH_LIMIT, IMPORT_LIMIT, WRITE_LIMIT, limiter, user_or_ip
from ..models import POI, Category, Comment, RouteNode, Visit, utcnow
from ..patching import apply_patch, required_fields
from ..phone import to_e164
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

# Cap import uploads so a single request can't exhaust memory.
MAX_IMPORT_BYTES = 10 * 1024 * 1024  # 10 MiB


@router.get("", response_model=list[POIRead])
def list_pois(session: SessionDep, _: CurrentUser) -> list[POIRead]:
    # One grouped aggregate for the whole list — the average and number of
    # ratings per POI, ignoring visits left without a rating.
    agg = session.exec(
        select(Visit.poi_id, func.avg(Visit.rating), func.count(Visit.rating))
        .where(Visit.rating.is_not(None))
        .group_by(Visit.poi_id)
    ).all()
    ratings = {poi_id: (avg, count) for poi_id, avg, count in agg}

    result: list[POIRead] = []
    for poi in session.exec(select(POI)).all():
        read = POIRead.model_validate(poi, from_attributes=True)
        avg, count = ratings.get(poi.id, (None, 0))
        read.avg_rating = round(avg, 2) if avg is not None else None
        read.rating_count = count
        result.append(read)
    return result


@router.post("", response_model=POIRead, status_code=status.HTTP_201_CREATED)
@limiter.limit(WRITE_LIMIT, key_func=user_or_ip)
async def create_poi(request: Request, body: POICreate, session: SessionDep, user: CurrentUser) -> POI:
    data = body.model_dump()
    data["image_url"] = await localize(data.get("image_url"))
    data["phone"] = to_e164(data.get("phone"))
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
@limiter.limit(IMPORT_LIMIT, key_func=user_or_ip)
async def import_pois(request: Request, session: SessionDep, user: CurrentUser, file: UploadFile = File(...)) -> ImportResult:
    raw = await file.read()
    if len(raw) > MAX_IMPORT_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large (max {MAX_IMPORT_BYTES // (1024 * 1024)} MiB)",
        )
    text = raw.decode("utf-8", errors="replace")
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
        if not isinstance(row.get("name"), str) or not row["name"].strip():
            errors.append(ImportRowError(row=i, reason="missing name"))
            continue
        # Imported properties are untrusted: validate types, ranges and lengths
        # with the same schema the REST API uses. A bad row never aborts the import.
        try:
            data = POICreate.model_validate({
                k: row.get(k)
                for k in ("name", "address", "lat", "lng", "tags", "notes", "phone",
                          "email", "website", "image_url", "source_url")
            }).model_dump()
        except ValidationError as exc:
            first = exc.errors()[0]
            field = ".".join(str(x) for x in first["loc"])
            reason = "invalid coordinates" if field in ("lat", "lng") else f"invalid {field}: {first['msg']}"
            errors.append(ImportRowError(row=i, reason=reason))
            continue
        cat_raw = row.get("category")
        if cat_raw is not None and not isinstance(cat_raw, str):
            errors.append(ImportRowError(row=i, reason="invalid category"))
            continue

        poi_name = data["name"]
        lat = data["lat"]
        lng = data["lng"]
        category_id: int | None = None
        cat_name = (cat_raw or "").strip()
        if cat_name:
            key = cat_name.lower()
            if key in cache:
                category_id = cache[key]
            else:
                cat = Category(name=cat_name[:200], color="#4f46e5", created_by=user.id)
                session.add(cat)
                session.flush()
                cache[key] = cat.id
                category_id = cat.id

        if find_duplicate(session, poi_name, lat, lng, data["source_url"]):
            skipped += 1
            continue

        data["image_url"] = await localize(data["image_url"])
        data["phone"] = to_e164(data["phone"])
        data["category_id"] = category_id
        poi = POI(**data, created_by=user.id)
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
@limiter.limit(ENRICH_LIMIT, key_func=user_or_ip)
async def update_poi(request: Request, poi_id: int, body: POIUpdate, session: SessionDep, user: CurrentUser) -> POI:
    poi = session.get(POI, poi_id)
    if not poi:
        raise HTTPException(status_code=404, detail="Not found")
    require_owner_or_admin(poi.created_by, user)
    data = body.model_dump(exclude_unset=True)
    if "image_url" in data:
        data["image_url"] = await localize(data["image_url"])
    if "phone" in data:
        data["phone"] = to_e164(data["phone"])
    apply_patch(poi, data, non_nullable=required_fields(POI))
    poi.updated_at = utcnow()
    session.add(poi)
    session.commit()
    session.refresh(poi)
    return poi


@router.delete("/{poi_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_poi(poi_id: int, session: SessionDep, user: CurrentUser) -> Response:
    poi = session.get(POI, poi_id)
    if not poi:
        raise HTTPException(status_code=404, detail="Not found")
    require_owner_or_admin(poi.created_by, user)
    for model in (Visit, Comment):
        for row in session.exec(select(model).where(model.poi_id == poi_id)).all():
            session.delete(row)
    # Route nodes keep their name/lat/lng snapshot but must not keep pointing
    # at a POI id that SQLite may hand out again.
    for node in session.exec(select(RouteNode).where(RouteNode.poi_id == poi_id)).all():
        node.poi_id = None
        session.add(node)
    session.delete(poi)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
