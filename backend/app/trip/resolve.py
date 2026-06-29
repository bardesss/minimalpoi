"""Apply a stored TRIP snapshot back onto a local entity (the "Keep TRIP" path).

Pure: no DB/session/IO. The caller resolves the snapshot's TRIP category_id to a
local category id and passes it in. image_url is intentionally untouched — the
snapshot does not carry the image, so accepting TRIP must not wipe a local image.
"""

from .mapping import fields_from_links, trip_category_to_fields


def apply_place_snapshot(poi, snapshot: dict, category_id: int | None) -> None:
    # Required columns: only overwrite when the snapshot actually carries a value,
    # so a partial/old snapshot can't write NULL into name/lat/lng and corrupt the row.
    if snapshot.get("name") is not None:
        poi.name = snapshot["name"]
    if snapshot.get("lat") is not None:
        poi.lat = snapshot["lat"]
    if snapshot.get("lng") is not None:
        poi.lng = snapshot["lng"]
    poi.address = snapshot.get("place")
    poi.notes = snapshot.get("description")
    poi.category_id = category_id
    link_fields = fields_from_links(snapshot.get("links"))
    poi.website = link_fields.get("website")
    poi.phone = link_fields.get("phone")
    poi.email = link_fields.get("email")


def apply_category_snapshot(cat, snapshot: dict) -> None:
    fields = trip_category_to_fields(snapshot)
    cat.name = fields["name"]
    cat.color = fields["color"]
