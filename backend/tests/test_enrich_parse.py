from pathlib import Path

from app.enrich.parse import parse_geo, parse_jsonld, parse_opengraph, parse_twitter

FIX = Path(__file__).parent / "fixtures"


def _read(name: str) -> str:
    return (FIX / name).read_text(encoding="utf-8")


def test_opengraph_extracts_title_image_description():
    og = parse_opengraph(_read("generic_og.html"))
    assert og["title"] == "Some Place"
    assert og["image"] == "https://img.example/p.png"
    assert og["description"] == "Nice place."


def test_opengraph_empty_when_absent():
    assert parse_opengraph(_read("no_metadata.html")) == {}


def test_jsonld_restaurant_fields():
    data = parse_jsonld(_read("tripadvisor_restaurant.html"))
    assert data["name"] == "Café Modern"
    assert data["lat"] == 52.3676
    assert data["lng"] == 4.9041
    assert data["phone"] == "+31 20 000 0000"
    assert data["website"] == "https://cafe.example"
    assert "Street 12" in data["address"]
    assert "Amsterdam" in data["address"]


def test_jsonld_localbusiness_partial():
    data = parse_jsonld(_read("jsonld_localbusiness.html"))
    assert data["name"] == "The Shop"
    assert data["lat"] == 52.0907
    assert "Main 1" in data["address"]


def test_jsonld_empty_when_absent():
    assert parse_jsonld(_read("no_metadata.html")) == {}


def test_jsonld_graph_and_image_dict():
    data = parse_jsonld(_read("jsonld_graph.html"))
    assert data["name"] == "Graph Cafe"
    assert data["image"] == "https://img.example/g.jpg"
    assert data["lat"] == 51.5


def test_twitter_card_extracts_title_image_description():
    tw = parse_twitter(_read("twitter_card.html"))
    assert tw["title"] == "Twitter Bistro"
    assert tw["image"] == "https://img.example/tw.jpg"
    assert tw["description"] == "A cozy spot."


def test_twitter_empty_when_absent():
    assert parse_twitter(_read("no_metadata.html")) == {}


def test_parse_geo_from_place_location():
    geo = parse_geo(_read("og_place_geo.html"))
    assert geo["lat"] == 48.8566
    assert geo["lng"] == 2.3522


def test_parse_geo_empty_when_absent():
    assert parse_geo(_read("no_metadata.html")) == {}


def test_jsonld_recognizes_museum_type():
    data = parse_jsonld(_read("jsonld_museum.html"))
    assert data["name"] == "City Museum"
    assert data["lat"] == 52.0
    assert data["lng"] == 4.0
