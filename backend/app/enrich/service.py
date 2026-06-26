from sqlmodel import Session

from ..crypto import decrypt
from ..models import get_or_create_settings
from ..phone import to_e164
from ..schemas import POIDraft
from . import gmaps
from .fetch import fetch_url
from .geocode import nominatim_geocode
from .parse import parse_geo, parse_jsonld, parse_opengraph, parse_twitter


def _set(draft: POIDraft, field: str, value, source: str) -> None:
    if value in (None, "") or getattr(draft, field) is not None:
        return
    setattr(draft, field, value)
    draft.field_sources[field] = source


async def enrich(url: str, session: Session, client=None) -> POIDraft:
    draft = POIDraft(source_url=url, field_sources={})
    settings = get_or_create_settings(session)
    google_key = decrypt(settings.google_api_key_enc) if settings.google_api_key_enc else None

    target = url
    if gmaps.is_google_maps(url):
        if gmaps.is_shortlink(url):
            target = await gmaps.resolve_shortlink(url, client=client)
        coords = gmaps.extract_coords(target)
        if coords:
            _set(draft, "lat", coords[0], "gmaps_url")
            _set(draft, "lng", coords[1], "gmaps_url")
        name = gmaps.extract_place_name(target)
        _set(draft, "name", name, "gmaps_url")
        if google_key:
            query = name or target
            places = await gmaps.places_lookup(query, google_key, client=client)
            if places:
                _set(draft, "name", places.get("name"), "places")
                _set(draft, "address", places.get("address"), "places")
                _set(draft, "lat", places.get("lat"), "places")
                _set(draft, "lng", places.get("lng"), "places")
                place_id = places.get("place_id")
                if place_id:
                    details = await gmaps.place_details(place_id, google_key, client=client)
                    if details:
                        _set(draft, "phone", to_e164(details.get("phone")), "places")
                        _set(draft, "website", details.get("website"), "places")
                        ref = details.get("photo_reference")
                        if ref:
                            photo = await gmaps.resolve_photo_url(ref, google_key, client=client)
                            _set(draft, "image_url", photo, "places")
    else:
        result = await fetch_url(target, client=client)
        if result and result.text:
            ld = parse_jsonld(result.text)
            og = parse_opengraph(result.text)
            _set(draft, "name", ld.get("name"), "jsonld")
            _set(draft, "address", ld.get("address"), "jsonld")
            _set(draft, "lat", ld.get("lat"), "jsonld")
            _set(draft, "lng", ld.get("lng"), "jsonld")
            _set(draft, "phone", ld.get("phone"), "jsonld")
            _set(draft, "website", ld.get("website"), "jsonld")
            _set(draft, "image_url", ld.get("image"), "jsonld")
            _set(draft, "description", ld.get("description"), "jsonld")
            _set(draft, "name", og.get("title"), "opengraph")
            _set(draft, "image_url", og.get("image"), "opengraph")
            _set(draft, "description", og.get("description"), "opengraph")
            tw = parse_twitter(result.text)
            _set(draft, "name", tw.get("title"), "twitter")
            _set(draft, "image_url", tw.get("image"), "twitter")
            _set(draft, "description", tw.get("description"), "twitter")
            geo = parse_geo(result.text)
            _set(draft, "lat", geo.get("lat"), "og")
            _set(draft, "lng", geo.get("lng"), "og")

    # Coordinate fallback via Nominatim if still missing.
    if (draft.lat is None or draft.lng is None):
        query = ", ".join(p for p in (draft.name, draft.address) if p)
        if query:
            coords = await nominatim_geocode(query, settings.nominatim_url or "https://nominatim.openstreetmap.org", client=client)
            if coords:
                _set(draft, "lat", coords[0], "nominatim")
                _set(draft, "lng", coords[1], "nominatim")
    return draft
