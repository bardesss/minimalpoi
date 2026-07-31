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
    """Key authenticated requests by identity, anonymous ones by client IP.

    The bearer branch comes first, matching get_current_user's precedence
    (deps.py). Programmatic clients never carry the login cookie, so without it
    every MCP request fell through to get_remote_address — and MCP tools reach
    the app through httpx.ASGITransport, which stamps each in-process call with
    the same synthetic address, collapsing all MCP callers into one bucket.

    The key is the token's sha256, not its owning user: resolving token -> user
    is a blocking SQLite read and this function runs synchronously on the event
    loop (mcp_auth.BearerAuthMiddleware offloads that same read to a threadpool
    for exactly this reason). Buckets are therefore per token rather than per
    user, and the raw secret never enters the limiter's store.
    """
    authorization = request.headers.get("authorization", "")
    if authorization.lower().startswith("bearer "):
        from .apitokens import hash_api_token

        return f"token:{hash_api_token(authorization[7:].strip())}"

    token = request.cookies.get("access_token")
    if token:
        from .security import decode_access_token

        payload = decode_access_token(token)
        if payload and payload.get("sub"):
            return f"user:{payload['sub']}"
    return get_remote_address(request)


# NOTE: do NOT enable headers_enabled. slowapi injects X-RateLimit-* headers by
# requiring every limited endpoint to declare a `response: Response` param; ours
# mostly return via response_model, so enabling it 500s those endpoints (caught
# only with the limiter live — see tests/test_ratelimit.py).
limiter = Limiter(key_func=get_remote_address)

# Central, tunable limits. IP-keyed unless applied with key_func=user_or_ip.
LOGIN_LIMIT = "5/minute;50/hour"   # brute-force / credential stuffing
SETUP_LIMIT = "10/minute"          # first-run probes
GOOGLE_LIMIT = "30/minute"         # paid Places API — denial-of-wallet
ENRICH_LIMIT = "20/minute"         # outbound fetch amplification
UPLOAD_LIMIT = "60/minute"         # disk exhaustion
IMPORT_LIMIT = "10/minute"         # bulk CPU/disk
SYNC_LIMIT = "1 per 30 seconds"    # hammering the TRIP API
WRITE_LIMIT = "60/minute"          # row-spam on create endpoints
PUBLIC_LIMIT = "60/minute"         # unauthenticated share-link scraping/guessing
