"""MCP server for MinimalPOI, mounted into the FastAPI app.

Tools are thin: each reads the caller's bearer token from its Context and calls
the app's own /api endpoints in-process, so all existing authorization,
validation, rate-limiting, and SSE behavior is reused verbatim.
"""
import contextlib

import httpx
from mcp.server.fastmcp import Context, FastMCP
from mcp.server.transport_security import TransportSecuritySettings

# main.py registers this app via an exact `Route("/api/mcp", ...)` (not
# `app.mount`, see the comment there for why), which forwards the ASGI scope
# untouched - no path is stripped the way a Mount would. So the SDK's
# internal route must match the real, full request path exactly, not its own
# default `/mcp` sub-path.
#
# `transport_security` disables the SDK's DNS-rebinding Host/Origin check,
# which otherwise only accepts `localhost`/`127.0.0.1`/`::1` Host headers
# (mismatching MinimalPOI's real deployment hostname, and Starlette
# TestClient's synthetic `testserver` host, with a 421). That protection
# guards servers that trust an ambient "you can reach me on localhost"
# credential; every request here is instead independently authenticated by
# `mcp_auth.BearerAuthMiddleware` before it reaches this app, so the Host
# header carries no trust decision to rebind.
mcp = FastMCP(
    "MinimalPOI",
    stateless_http=True,
    streamable_http_path="/api/mcp",
    transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=False),
)


def _bearer(ctx: Context) -> str:
    """The caller's `Authorization` header, guaranteed present by the mount's
    BearerAuthMiddleware."""
    request = ctx.request_context.request
    return request.headers.get("authorization", "")


def _client(auth: str) -> httpx.AsyncClient:
    """An in-process HTTP client bound to the FastAPI root app, forwarding the
    caller's token. Imported lazily to avoid an import cycle with main."""
    from .main import app
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://mcp.internal",
        headers={"Authorization": auth},
    )


def _raise_for_tool(resp: httpx.Response) -> None:
    """Translate a non-2xx API response into a clean tool error."""
    if resp.is_success:
        return
    try:
        detail = resp.json().get("detail")
    except Exception:
        detail = None
    raise ValueError(f"{resp.status_code}: {detail or resp.text[:200]}")


# Tools are registered in later tasks (import side effects).
from . import mcp_tools_pois  # noqa: E402,F401
# TODO(Task 7): from . import mcp_tools_routes  # noqa: E402,F401


class _MCPAppProxy:
    """Stable ASGI entry point that forwards to whichever concrete
    streamable-HTTP app is currently active.

    Deviation from the SDD brief: the installed SDK's
    `StreamableHTTPSessionManager.run()` may be entered at most once per
    instance ("Create a new instance if you need to run again"). That's fine
    for a real server (one process, one lifespan), but MinimalPOI's test
    suite opens a fresh `TestClient(app)` - and therefore a fresh FastAPI
    lifespan - for nearly every test function. Mounting a single, never-
    replaced proxy object at `/api/mcp` and rebuilding the concrete app +
    session manager on each lifespan start (`run_mcp_session` below) keeps
    every test's lifespan independent without touching `app.mount(...)`.
    """

    def __init__(self) -> None:
        self._current = None

    def set(self, app) -> None:
        self._current = app

    async def __call__(self, scope, receive, send) -> None:
        await self._current(scope, receive, send)


mcp_app = _MCPAppProxy()


@contextlib.asynccontextmanager
async def run_mcp_session():
    """Build a fresh streamable-HTTP app + session manager and run the
    manager for the lifetime of the caller's `async with` block. Call once
    per FastAPI app lifespan (see `main.lifespan`).

    Resetting the private `_session_manager` forces FastMCP to lazily build a
    brand-new `StreamableHTTPSessionManager` on the next `streamable_http_app()`
    call, sidestepping the "run() at most once per instance" restriction
    across repeated lifespans. The `mcp` FastMCP instance itself (and its
    registered tools) is left untouched.
    """
    mcp._session_manager = None
    mcp_app.set(mcp.streamable_http_app())
    async with mcp.session_manager.run():
        yield
