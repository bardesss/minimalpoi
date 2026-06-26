from app.phone import to_e164


def test_international_number_normalizes_to_e164():
    assert to_e164("+31 20 308 0090") == "+31203080090"
    assert to_e164("+1 (212) 736-3100") == "+12127363100"
    assert to_e164("+49 30 2618-0") == "+493026180"


def test_worldwide_not_limited_to_one_region():
    # Australia, Japan, Brazil — all normalize from their international form.
    assert to_e164("+61 2 9374 4000") == "+61293744000"
    assert to_e164("+81 3-3201-3331") == "+81332013331"


def test_national_without_region_is_kept_as_is():
    # No country code and no region hint → cannot confidently parse; keep raw.
    assert to_e164("020 308 0090") == "020 308 0090"


def test_region_hint_parses_national_form():
    assert to_e164("020 308 0090", region="NL") == "+31203080090"


def test_invalid_and_empty_are_lenient():
    assert to_e164("not a phone") == "not a phone"
    assert to_e164("") is None
    assert to_e164("   ") is None
    assert to_e164(None) is None
