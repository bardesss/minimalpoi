# backend/tests/test_mcp_transport.py
from app import db
from app.apitokens import generate_api_token
from app.models import ApiToken, User
from app.security import hash_password
from sqlmodel import Session

# The MCP client must accept both JSON and SSE responses.
MCP_HEADERS = {"Accept": "application/json, text/event-stream", "Content-Type": "application/json"}
INIT = {"jsonrpc": "2.0", "id": 1, "method": "initialize",
        "params": {"protocolVersion": "2024-11-05",
                   "capabilities": {}, "clientInfo": {"name": "t", "version": "1"}}}


def _token():
    with Session(db.engine) as s:
        u = User(username="alice", password_hash=hash_password("pw"))
        s.add(u); s.commit(); s.refresh(u)
        full, prefix, token_hash = generate_api_token()
        s.add(ApiToken(user_id=u.id, name="t", token_hash=token_hash, prefix=prefix))
        s.commit()
    return full


def test_mcp_requires_token(client):
    r = client.post("/api/mcp", json=INIT, headers=MCP_HEADERS)
    assert r.status_code == 401


def test_mcp_initialize_with_token(client):
    token = _token()
    r = client.post("/api/mcp", json=INIT,
                    headers={**MCP_HEADERS, "Authorization": f"Bearer {token}"})
    assert r.status_code == 200


def test_gate_validates_without_writing_last_used(client):
    # A valid token passes the gate for `initialize`, but the gate is write-free:
    # last_used_at stays None because no tool call (hence no get_current_user) ran.
    token = _token()
    r = client.post("/api/mcp", json=INIT,
                    headers={**MCP_HEADERS, "Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    from app.apitokens import hash_api_token
    from app.models import ApiToken
    from sqlmodel import select
    with Session(db.engine) as s:
        row = s.exec(select(ApiToken).where(ApiToken.token_hash == hash_api_token(token))).first()
        assert row is not None and row.last_used_at is None
