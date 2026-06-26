"""Worldwide phone-number normalization.

`to_e164` standardizes a phone string to E.164 (e.g. "+31203080090") whenever
it can be confidently parsed as a valid international number. It is intentionally
**lenient**: anything it cannot confidently parse (a national number with no
country code and no region hint, free-form text, etc.) is returned trimmed and
unchanged — a POI must never fail to save over a phone format. The frontend
country-picker input emits valid E.164, so UI entries normalize cleanly; this
helper is the safety net for enrichment / import / API callers.
"""

import phonenumbers


def to_e164(raw: str | None, region: str | None = None) -> str | None:
    if raw is None:
        return None
    value = raw.strip()
    if not value:
        return None
    try:
        num = phonenumbers.parse(value, region)
    except phonenumbers.NumberParseException:
        return value
    if phonenumbers.is_valid_number(num):
        return phonenumbers.format_number(num, phonenumbers.PhoneNumberFormat.E164)
    return value
