"""End-to-end coverage for the `_bearer(ctx)` -> tool -> in-process-forward
seam: drives a real `tools/call` for `list_pois` through `POST /api/mcp`
using the official MCP SDK client (streamable-HTTP transport) over an
in-process ASGI httpx client, and confirms a POI created via the regular
REST API comes back in the tool result.

The other MCP tests (test_mcp_transport.py, test_mcp_tools_pois_create.py)
either only exercise the transport handshake or call the tools' private
`_name(auth, ...)` coroutines directly, bypassing the JSON-RPC envelope and
the `Context`/`_bearer` plumbing entirely. This test is the one place that
proves a real client can complete the full round trip.
"""
import json

import httpx
import pytest
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

from app import db
from app.apitokens import generate_api_token
from app.models import ApiToken, User
from app.security import hash_password
from sqlmodel import Session


@pytest.fixture
def anyio_backend():
    return "asyncio"


def _token():
    with Session(db.engine) as s:
        u = User(username="alice", password_hash=hash_password("pw"))
        s.add(u); s.commit(); s.refresh(u)
        full, prefix, token_hash = generate_api_token()
        s.add(ApiToken(user_id=u.id, name="t", token_hash=token_hash, prefix=prefix))
        s.commit()
    return full


@pytest.mark.anyio
async def test_list_pois_tool_call_round_trips_through_mcp(client):
    token = _token()

    # Create a POI through the ordinary REST API, using the same token the
    # MCP tool call will present.
    created = client.post(
        "/api/pois",
        json={"name": "Lighthouse Cafe", "lat": 52.37, "lng": 4.89},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert created.status_code == 201, created.text
    poi_id = created.json()["id"]

    # The `client` fixture's TestClient has already run the app's lifespan
    # (which starts the MCP session manager), so a second, independent async
    # httpx client bound to the same ASGI app can drive a real MCP session
    # against it.
    from app.main import app

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://mcp.internal",
        headers={"Authorization": f"Bearer {token}"},
    ) as http_client:
        async with streamable_http_client(
            "http://mcp.internal/api/mcp", http_client=http_client
        # mcp 2.0 dropped the third `get_session_id` element from the yield.
        ) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                result = await session.call_tool("list_pois", {})

    # mcp 2.0 renamed CallToolResult's fields to snake_case.
    assert not result.is_error

    if result.structured_content is not None:
        # MCPServer wraps non-object return types (here, a bare list) under a
        # "result" key per the MCP output-schema convention.
        pois = result.structured_content.get("result", result.structured_content)
    else:
        text = next(block.text for block in result.content if block.type == "text")
        pois = json.loads(text)

    assert any(p["id"] == poi_id and p["name"] == "Lighthouse Cafe" for p in pois)
