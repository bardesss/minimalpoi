import base64

from app.trip import mapping


class _POI:
    def __init__(self, **kw):
        self.__dict__.update(kw)


def test_links_round_trip():
    poi = _POI(website="https://x.example", phone="+31 20 1", email="a@b.nl")
    links = mapping.links_from_poi(poi)
    assert "https://x.example" in links
    assert "tel:+31 20 1" in links
    assert "mailto:a@b.nl" in links
    back = mapping.fields_from_links(links)
    assert back == {"website": "https://x.example", "phone": "+31 20 1", "email": "a@b.nl"}


def test_poi_to_trip_payload():
    poi = _POI(name="Café", lat=52.0, lng=4.0, address="Street 1", notes="nice",
               website="https://x.example", phone=None, email=None, image_url=None)
    payload = mapping.poi_to_trip_payload(poi, trip_category_id=7)
    assert payload["name"] == "Café"
    assert payload["lat"] == 52.0 and payload["lng"] == 4.0
    assert payload["place"] == "Street 1"
    assert payload["category_id"] == 7
    assert payload["description"] == "nice"
    assert payload["links"] == ["https://x.example"]
    assert "image" not in payload  # include_image defaults False


def test_poi_to_trip_payload_place_falls_back_to_name():
    poi = _POI(name="OnlyName", lat=1.0, lng=2.0, address=None, notes=None,
               website=None, phone=None, email=None, image_url=None)
    payload = mapping.poi_to_trip_payload(poi, trip_category_id=1)
    assert payload["place"] == "OnlyName"  # `place` is required by TRIP; never empty


def test_trip_place_to_poi_fields():
    trip_place = {"name": "B", "lat": 1.5, "lng": 2.5, "place": "Addr",
                  "description": "d", "links": ["https://w.example", "tel:+1", "mailto:e@f.gh"],
                  "image": "https://trip.lan/assets/p.jpg"}
    fields = mapping.trip_place_to_poi_fields(trip_place, category_id=3)
    assert fields["name"] == "B"
    assert fields["address"] == "Addr"
    assert fields["category_id"] == 3
    assert fields["notes"] == "d"
    assert fields["website"] == "https://w.example"
    assert fields["phone"] == "+1"
    assert fields["email"] == "e@f.gh"
    assert fields["image_url"] == "https://trip.lan/assets/p.jpg"


def test_category_mappings():
    cat = _POI(name="Food", color="#2F9E63")
    assert mapping.category_to_trip_payload(cat) == {"name": "Food", "color": "#2F9E63"}
    assert mapping.trip_category_to_fields({"name": "Food", "color": "#2F9E63"}) == {"name": "Food", "color": "#2F9E63"}


def test_image_b64_local(data_dir):
    from app.enrich.images import images_dir
    (images_dir() / "pic.png").write_bytes(b"PNGDATA")
    poi = _POI(image_url="/images/pic.png")
    out = mapping.image_b64_from_poi(poi)
    assert out == base64.b64encode(b"PNGDATA").decode("ascii")
    assert mapping.image_b64_from_poi(_POI(image_url=None)) is None
    assert mapping.image_b64_from_poi(_POI(image_url="https://remote/x.jpg")) is None
