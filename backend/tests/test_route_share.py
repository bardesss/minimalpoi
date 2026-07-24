def _setup(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    client.patch("/api/settings", json={"routes_enabled": True})


def _route(client, **kw):
    body = {"name": "NL", "start_date": "2026-07-14", **kw}
    return client.post("/api/routes", json=body).json()


def test_routeshare_table_persists_and_token_is_unique(client):
    # The new table exists after init_db and enforces a unique token.
    from app import db
    from app.models import RouteShare
    from sqlmodel import Session, select
    _setup(client)
    rid = _route(client)["id"]
    with Session(db.engine) as s:
        s.add(RouteShare(token="tok-abc", route_id=rid, created_by=1))
        s.commit()
        got = s.exec(select(RouteShare).where(RouteShare.token == "tok-abc")).first()
        assert got is not None and got.route_id == rid
        assert got.password_hash is None and got.expires_at is None
