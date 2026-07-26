import json

from sqlmodel import Session
from starlette.concurrency import run_in_threadpool
from starlette.types import ASGIApp, Receive, Scope, Send

from . import db
from .apitokens import resolve_api_token


class BearerAuthMiddleware:
    """Reject any request to the wrapped MCP app that lacks a valid API token,
    so an unauthenticated client can't open a session."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        headers = {k.decode().lower(): v.decode() for k, v in scope.get("headers", [])}
        auth = headers.get("authorization", "")
        ok = False
        if auth.lower().startswith("bearer "):
            # The token check is a blocking SQLite read; run it on a worker
            # thread so it never stalls the event loop under concurrent MCP
            # requests.
            ok = await run_in_threadpool(self._validate, auth[7:].strip())
        if not ok:
            body = json.dumps({"detail": "Invalid or missing API token"}).encode()
            await send({"type": "http.response.start", "status": 401,
                        "headers": [(b"content-type", b"application/json")]})
            await send({"type": "http.response.body", "body": body})
            return
        await self.app(scope, receive, send)

    def _validate(self, token: str) -> bool:
        # touch=False: this gate is a pure validity check. The downstream
        # in-process call to get_current_user (resolve_api_token with the
        # default touch=True) owns the last_used_at write, so we don't write
        # it twice per MCP request.
        with Session(db.engine) as session:
            return resolve_api_token(session, token, touch=False) is not None
