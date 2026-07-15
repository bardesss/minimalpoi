import httpx

from ..models import LegSource
from .calc import Leg

DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json"


class GoogleCalc:
    """Real driving distance/duration via the Google Directions API."""

    def __init__(self, api_key: str, client: httpx.AsyncClient | None = None) -> None:
        self.api_key = api_key
        self.client = client

    async def leg(self, a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> Leg | None:
        owns = self.client is None
        client = self.client or httpx.AsyncClient(timeout=10.0)
        try:
            resp = await client.get(DIRECTIONS_URL, params={
                "origin": f"{a_lat},{a_lng}",
                "destination": f"{b_lat},{b_lng}",
                "mode": "driving",
                "key": self.api_key,
            })
            data = resp.json()
        except (httpx.HTTPError, ValueError):
            return None
        finally:
            if owns:
                await client.aclose()
        routes = data.get("routes") or []
        if not routes:
            return None
        legs = routes[0].get("legs") or []
        if not legs:
            return None
        dist = sum((leg.get("distance") or {}).get("value", 0) for leg in legs)
        dur = sum((leg.get("duration") or {}).get("value", 0) for leg in legs)
        geometry = (routes[0].get("overview_polyline") or {}).get("points") or None
        return Leg(distance_m=int(dist), duration_s=int(dur),
                   source=LegSource.GOOGLE.value, geometry=geometry)
