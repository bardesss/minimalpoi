import base64

from ..enrich.images import images_dir


def links_from_poi(poi) -> list[str]:
    links: list[str] = []
    if getattr(poi, "website", None):
        links.append(poi.website)
    if getattr(poi, "phone", None):
        links.append(f"tel:{poi.phone}")
    if getattr(poi, "email", None):
        links.append(f"mailto:{poi.email}")
    return links


def fields_from_links(links: list[str] | None) -> dict:
    out: dict = {}
    for link in links or []:
        if link.startswith("tel:"):
            out["phone"] = link[4:]
        elif link.startswith("mailto:"):
            out["email"] = link[7:]
        elif "website" not in out:
            out["website"] = link
    return out


def image_b64_from_poi(poi) -> str | None:
    url = getattr(poi, "image_url", None)
    if not url or not url.startswith("/images/"):
        return None
    path = images_dir() / url.rsplit("/", 1)[-1]
    if not path.exists():
        return None
    return base64.b64encode(path.read_bytes()).decode("ascii")


def poi_to_trip_payload(poi, trip_category_id: int, include_image: bool = False) -> dict:
    payload = {
        "name": poi.name,
        "lat": poi.lat,
        "lng": poi.lng,
        "place": poi.address or poi.name or "",
        "category_id": trip_category_id,
        "description": getattr(poi, "notes", None),
        "links": links_from_poi(poi),
    }
    if include_image:
        b64 = image_b64_from_poi(poi)
        if b64:
            payload["image"] = b64
    return payload


def trip_place_to_poi_fields(trip_place: dict, category_id: int | None) -> dict:
    fields = {
        "name": trip_place.get("name"),
        "lat": trip_place.get("lat"),
        "lng": trip_place.get("lng"),
        "address": trip_place.get("place"),
        "category_id": category_id,
        "notes": trip_place.get("description"),
        "image_url": trip_place.get("image"),
    }
    fields.update(fields_from_links(trip_place.get("links")))
    return fields


def category_to_trip_payload(cat) -> dict:
    return {"name": cat.name, "color": cat.color}


def trip_category_to_fields(trip_cat: dict) -> dict:
    return {"name": trip_cat.get("name"), "color": trip_cat.get("color")}
