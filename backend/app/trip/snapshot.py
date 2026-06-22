from datetime import datetime

from .mapping import links_from_poi


def place_snapshot_local(poi, trip_category_id: int | None) -> dict:
    return {
        "name": poi.name,
        "lat": poi.lat,
        "lng": poi.lng,
        "place": poi.address or poi.name or "",
        "category_id": trip_category_id,
        "description": getattr(poi, "notes", None),
        "links": sorted(links_from_poi(poi)),
    }


def place_snapshot_trip(trip_place: dict, category_id: int | None) -> dict:
    return {
        "name": trip_place.get("name"),
        "lat": trip_place.get("lat"),
        "lng": trip_place.get("lng"),
        "place": trip_place.get("place"),
        "category_id": category_id,
        "description": trip_place.get("description"),
        "links": sorted(trip_place.get("links") or []),
    }


def category_snapshot_local(cat) -> dict:
    return {"name": cat.name, "color": cat.color}


def category_snapshot_trip(trip_cat: dict) -> dict:
    return {"name": trip_cat.get("name"), "color": trip_cat.get("color")}


def local_changed(updated_at: datetime, trip_synced_at: datetime | None) -> bool:
    if trip_synced_at is None:
        return True
    return updated_at > trip_synced_at


def local_changed_by_snapshot(current_local: dict, stored: dict | None) -> bool:
    return current_local != stored


def trip_changed(stored_snapshot: dict | None, current_trip_snapshot: dict) -> bool:
    return stored_snapshot != current_trip_snapshot
