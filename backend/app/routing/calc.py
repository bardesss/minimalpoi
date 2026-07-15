import math
from dataclasses import dataclass

from ..models import LegSource

EARTH_RADIUS_M = 6_371_000


@dataclass
class Leg:
    distance_m: int
    duration_s: int
    source: str
    # Encoded polyline of the driving path (Google only); None for haversine legs.
    geometry: str | None = None


def haversine_m(a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> float:
    p1, p2 = math.radians(a_lat), math.radians(b_lat)
    dphi = math.radians(b_lat - a_lat)
    dlmb = math.radians(b_lng - a_lng)
    h = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(h))


class HaversineCalc:
    """Great-circle distance with a flat average-speed duration estimate.
    Zero dependencies; the offline fallback when Google is unavailable."""

    def __init__(self, avg_kmh: float = 70.0) -> None:
        self.avg_kmh = avg_kmh

    def leg(self, a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> Leg:
        dist = haversine_m(a_lat, a_lng, b_lat, b_lng)
        seconds = int(dist / 1000 / self.avg_kmh * 3600)
        return Leg(distance_m=int(dist), duration_s=seconds, source=LegSource.ESTIMATE.value)
