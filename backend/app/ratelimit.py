"""Rate limiting (slowapi, in-memory) — the right fit for the single-container /
SQLite deployment; a Redis-backed limiter would be wrong here.

Unauthenticated endpoints (login, setup) are keyed by client IP. Authenticated
hotspots are keyed by the logged-in user (falling back to IP), so one account
can't exhaust everyone's budget. The limiter is created once and registered on
``app.state`` in ``main.py``; tests disable it via ``app.state.limiter.enabled``.
"""
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def user_or_ip(request: Request) -> str:
    """Key authenticated requests by username, anonymous ones by client IP."""
    token = request.cookies.get("access_token")
    if token:
        from .security import decode_access_token

        username = decode_access_token(token)
        if username:
            return f"user:{username}"
    return get_remote_address(request)


limiter = Limiter(key_func=get_remote_address, headers_enabled=True)

# Central, tunable limits. IP-keyed unless applied with key_func=user_or_ip.
LOGIN_LIMIT = "5/minute;50/hour"   # brute-force / credential stuffing
SETUP_LIMIT = "10/minute"          # first-run probes
GOOGLE_LIMIT = "30/minute"         # paid Places API — denial-of-wallet
ENRICH_LIMIT = "20/minute"         # outbound fetch amplification
UPLOAD_LIMIT = "60/minute"         # disk exhaustion
IMPORT_LIMIT = "10/minute"         # bulk CPU/disk
SYNC_LIMIT = "1 per 30 seconds"    # hammering the TRIP API
WRITE_LIMIT = "60/minute"          # row-spam on create endpoints
