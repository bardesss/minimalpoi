from pathlib import Path

from app.enrich.parse import parse_jsonld, parse_opengraph

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
