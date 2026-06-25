import csv
import io
import json
import re

from .models import POI


def _coerce_tags(value) -> list[str]:
    if isinstance(value, list):
        return [str(t).strip() for t in value if str(t).strip()]
    if isinstance(value, str):
        return [t.strip() for t in re.split(r"[;|]", value) if t.strip()]
    return []


def parse_geojson(text: str) -> list[dict]:
    try:
        data = json.loads(text)
    except (ValueError, TypeError):
        return []
    features = data.get("features") if isinstance(data, dict) else None
    if not isinstance(features, list):
        return []
    rows: list[dict] = []
    for feat in features:
        if not isinstance(feat, dict):
            continue
        geom = feat.get("geometry") or {}
        if not isinstance(geom, dict) or geom.get("type") != "Point":
            continue
        coords = geom.get("coordinates")
        lng = lat = None
        if isinstance(coords, list) and len(coords) >= 2:
            lng, lat = coords[0], coords[1]
        props = feat.get("properties") if isinstance(feat.get("properties"), dict) else {}
        rows.append({
            "name": props.get("name"),
            "category": props.get("category"),
            "address": props.get("address"),
            "lat": lat,
            "lng": lng,
            "phone": props.get("phone"),
            "email": props.get("email"),
            "website": props.get("website"),
            "notes": props.get("notes"),
            "tags": _coerce_tags(props.get("tags")),
            "image_url": props.get("image_url"),
            "source_url": props.get("source_url"),
        })
    return rows


def parse_csv(text: str) -> list[dict]:
    reader = csv.DictReader(io.StringIO(text))
    rows: list[dict] = []
    for raw in reader:
        low = {(k or "").strip().lower(): v for k, v in raw.items()}
        rows.append({
            "name": low.get("name"),
            "category": low.get("category"),
            "address": low.get("address"),
            "lat": low.get("lat") or low.get("latitude"),
            "lng": low.get("lng") or low.get("longitude"),
            "phone": low.get("phone"),
            "email": low.get("email"),
            "website": low.get("website"),
            "notes": low.get("notes"),
            "tags": _coerce_tags(low.get("tags")),
            "image_url": low.get("image_url"),
            "source_url": low.get("source_url"),
        })
    return rows


def pois_to_geojson(pois: list[POI], category_name_by_id: dict[int, str]) -> dict:
    features = []
    for p in pois:
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [p.lng, p.lat]},
            "properties": {
                "name": p.name,
                "category": category_name_by_id.get(p.category_id) if p.category_id is not None else None,
                "address": p.address,
                "phone": p.phone,
                "email": p.email,
                "website": p.website,
                "notes": p.notes,
                "tags": p.tags,
                "image_url": p.image_url,
                "source_url": p.source_url,
            },
        })
    return {"type": "FeatureCollection", "features": features}
