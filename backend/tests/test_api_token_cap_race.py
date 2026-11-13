"""Two concurrent token mints at MAX_TOKENS_PER_USER - 1 must not both pass the
cap check. Postgres-only: the fix is a row lock (SELECT ... FOR UPDATE on the
user), which SQLite ignores."""
import os
import threading

import pytest

from app import models  # noqa: F401  (register every table before drop_all)

POSTGRES = (os.environ.get("TEST_POSTGRES_URL")
            or (os.environ.get("DATABASE_URL") if os.environ.get("DATABASE_URL", "").startswith(("postgres://", "postgresql")) else None))
pytestmark = pytest.mark.skipif(POSTGRES is None, reason="needs a real Postgres")


def test_concurrent_mints_cannot_exceed_the_cap(client, monkeypatch):
    from fastapi import HTTPException
    from sqlmodel import Session, select

    from app import db
    from app.models import ApiToken, User
    from app.routers import api_tokens
    from app.schemas import ApiTokenCreate

    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    for i in range(api_tokens.MAX_TOKENS_PER_USER - 1):
        assert client.post("/api/tokens", json={"name": f"t{i}"}).status_code == 201

    # Each mint pauses right after its cap check until the other has also
    # checked (or 1.5 s pass). Without a lock both read 9 and both insert; with
    # the user row locked, the second check waits for the first commit.
    both_checked = threading.Barrier(2, timeout=1.5)
    real_generate = api_tokens.generate_api_token

    def slow_generate():
        try:
            both_checked.wait()
        except threading.BrokenBarrierError:
            pass  # the other mint is blocked on the lock: go ahead
        return real_generate()

    monkeypatch.setattr(api_tokens, "generate_api_token", slow_generate)
    results = []

    def mint(name):
        with Session(db.engine) as session:
            user = session.exec(select(User).where(User.username == "admin")).one()
            try:
                api_tokens.create_token(None, ApiTokenCreate(name=name), session, user)
                results.append(201)
            except HTTPException as exc:
                results.append(exc.status_code)

    threads = [threading.Thread(target=mint, args=(f"race{i}",)) for i in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=20)
    assert sorted(results) == [201, 409]
    with Session(db.engine) as s:
        assert len(s.exec(select(ApiToken)).all()) == api_tokens.MAX_TOKENS_PER_USER
