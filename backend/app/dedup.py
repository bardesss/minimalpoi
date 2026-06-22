import math
import unicodedata

from sqlmodel import Session, select

from .models import POI

PROXIMITY_THRESHOLD_M = 150.0


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(a))


def _norm(name: str) -> str:
    # Remove accents and normalize to ASCII
    nfd = unicodedata.normalize('NFD', name.lower())
    return "".join(ch for ch in nfd if ch.isalnum() and ord(ch) < 128)


def find_duplicate(
    session: Session,
    name: str,
    lat: float | None,
    lng: float | None,
    source_url: str | None,
) -> POI | None:
    candidates = session.exec(select(POI)).all()
    if source_url:
        for poi in candidates:
            if poi.source_url and poi.source_url == source_url:
                return poi
    if lat is not None and lng is not None:
        target = _norm(name)
        for poi in candidates:
            if _norm(poi.name) == target and haversine_m(lat, lng, poi.lat, poi.lng) <= PROXIMITY_THRESHOLD_M:
                return poi
    return None
