import json
import mimetypes
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from . import config, db
from .enrich.images import images_dir
from .mcp_auth import BearerAuthMiddleware
from .mcp_server import mcp_app, run_mcp_session
from .ratelimit import limiter
from .routing.events import RouteEventHub
from .routers import auth, backup, categories, comments, enrich, images, me, places, pois, public, routes, settings, tags, teams, users, version, visits
from .routers import api_tokens as api_tokens_module


# Python's stdlib mimetypes db doesn't reliably know `.webmanifest` on every
# platform (notably some Linux distros), which would otherwise serve the web
# app manifest as application/octet-stream and break installability.
mimetypes.add_type("application/manifest+json", ".webmanifest")


def spa_dist_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    app.state.route_hub = RouteEventHub()
    async with run_mcp_session():
        yield


class MaxBodySizeMiddleware:
    """Reject request bodies over the cap with 413 (pure ASGI).

    Checks Content-Length up front and counts streamed bytes for chunked
    bodies. Backup restore legitimately uploads big archives, so that one path
    gets its own (larger) limit instead of config.max_body_bytes().
    """

    RESTORE_PATH = "/api/restore"

    def __init__(self, app):
        self.app = app

    def _limit(self, path: str) -> int:
        if path == self.RESTORE_PATH:
            return config.restore_max_bytes()
        return config.max_body_bytes()

    def _detail(self, path: str) -> str:
        if path == self.RESTORE_PATH:
            return config.restore_limit_message("The uploaded backup")
        return "Request body too large"

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        limit = self._limit(scope["path"])
        detail = self._detail(scope["path"])
        for name, value in scope["headers"]:
            if name == b"content-length":
                try:
                    too_big = int(value) > limit
                except ValueError:
                    too_big = False
                if too_big:
                    await self._reject(send, detail)
                    return
                break

        received = 0
        started = False
        rejected = False

        async def counting_receive():
            nonlocal received, rejected
            message = await receive()
            if message["type"] == "http.request" and not rejected:
                received += len(message.get("body", b""))
                if received > limit:
                    # Answer 413 ourselves rather than raising into the app:
                    # FastAPI turns body-read errors into a 400. The app is
                    # told the client went away and its own reply is dropped.
                    rejected = True
                    if not started:
                        await self._reject(send, detail)
                    return {"type": "http.disconnect"}
            return message

        async def tracking_send(message):
            nonlocal started
            if rejected:
                return
            if message["type"] == "http.response.start":
                started = True
            await send(message)

        try:
            await self.app(scope, counting_receive, tracking_send)
        except Exception:
            if not rejected:
                raise

    @staticmethod
    async def _reject(send, detail: str):
        body = json.dumps({"detail": detail}).encode()
        await send({
            "type": "http.response.start",
            "status": 413,
            "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())],
        })
        await send({"type": "http.response.body", "body": body})


app = FastAPI(title="MinimalPOI", lifespan=lifespan)
app.add_middleware(MaxBodySizeMiddleware)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


async def _validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # The default handler echoes each offending `input` (and `ctx`) back, which
    # cannot be JSON-encoded for NaN/Infinity and would turn a 422 into a 500.
    errors = [{k: v for k, v in e.items() if k not in ("input", "ctx")} for e in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": errors})


app.add_exception_handler(RequestValidationError, _validation_error_handler)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(teams.router)
app.include_router(categories.router)
app.include_router(pois.router)
app.include_router(visits.router)
app.include_router(me.router)
app.include_router(api_tokens_module.router)
app.include_router(backup.router)
app.include_router(comments.router)
app.include_router(settings.router)
app.include_router(enrich.router)
app.include_router(places.router)
app.include_router(images.router)
app.include_router(tags.router)
app.include_router(routes.router)
app.include_router(public.router)
app.include_router(version.router)
app.mount("/images", StaticFiles(directory=str(images_dir())), name="images")
# An exact Route (not `app.mount`) on purpose: Starlette's `Mount` only ever
# matches a request whose path is the mount prefix *plus a trailing slash*
# (its path_regex is `^/api/mcp/(?P<path>.*)$`), so a client POSTing to the
# literal `/api/mcp` (no trailing slash - what every MCP client actually
# does) would fail to match the mount. Normally Starlette's redirect_slashes
# would paper over that with a 307, but the SPA catch-all route below already
# matches every path (it only registers GET), so it wins the request first as
# a same-path/wrong-method PARTIAL match, short-circuiting the redirect and
# yielding a bare 405 instead. Registering an exact-path Route (methods=None
# so every HTTP method is accepted) sidesteps trailing-slash matching
# entirely: the streamable-HTTP transport has a single logical endpoint here
# (no sub-paths), so a Mount's prefix semantics add nothing.
app.add_route("/api/mcp", BearerAuthMiddleware(mcp_app), methods=None)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


_dist = spa_dist_dir()
if (_dist / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=str(_dist / "assets")), name="assets")

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str) -> FileResponse:
        # Registered last: all API and static routes above match first.
        # Serve real files that sit at the dist root (favicon.svg, robots.txt,
        # …) directly; everything else falls through to the SPA entry point so
        # client-side routes still resolve on a hard refresh.
        #
        # index.html names the current build's hashed chunks, so it is sent
        # `no-cache` (always revalidated): a cached copy would keep asking for
        # chunks a new deploy removed. Hashed assets and other root files keep
        # their default caching.
        index = _dist / "index.html"
        if full_path:
            candidate = (_dist / full_path).resolve()
            if _dist.resolve() in candidate.parents and candidate.is_file() and candidate != index.resolve():
                return FileResponse(str(candidate))
        return FileResponse(str(index), headers={"Cache-Control": "no-cache"})
