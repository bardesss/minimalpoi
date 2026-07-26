import json

from sqlmodel import Session
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
            with Session(db.engine) as session:
                ok = resolve_api_token(session, auth[7:].strip()) is not None
        if not ok:
            body = json.dumps({"detail": "Invalid or missing API token"}).encode()
            await send({"type": "http.response.start", "status": 401,
                        "headers": [(b"content-type", b"application/json")]})
            await send({"type": "http.response.body", "body": body})
            return
        await self.app(scope, receive, send)
