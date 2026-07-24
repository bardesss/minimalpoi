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


def test_owner_can_create_update_regenerate_revoke_share(client):
    _setup(client)
    rid = _route(client)["id"]

    r = client.put(f"/api/routes/{rid}/share", json={})
    assert r.status_code == 200
    info = r.json()
    tok1 = info["token"]
    assert info["url"].endswith(f"/s/{tok1}")
    assert info["password_set"] is False and info["expires_at"] is None

    # GET /routes/{id} now surfaces the share (editor can see it).
    assert client.get(f"/api/routes/{rid}").json()["share"]["token"] == tok1

    # Update: set password + expiry, token unchanged.
    r = client.put(f"/api/routes/{rid}/share",
                   json={"password": "hunter22", "expires_at": "2099-01-01T00:00:00"})
    assert r.status_code == 200 and r.json()["token"] == tok1
    assert r.json()["password_set"] is True and r.json()["expires_at"] is not None

    # Remove password.
    r = client.put(f"/api/routes/{rid}/share", json={"remove_password": True})
    assert r.json()["password_set"] is False

    # Regenerate rotates the token.
    tok2 = client.post(f"/api/routes/{rid}/share/regenerate").json()["token"]
    assert tok2 != tok1

    # Revoke.
    assert client.delete(f"/api/routes/{rid}/share").status_code == 204
    assert client.get(f"/api/routes/{rid}").json()["share"] is None


def test_non_editor_cannot_manage_share(client):
    _setup(client)
    rid = _route(client)["id"]
    # second, non-admin user who is not on the route's team
    client.post("/api/users", json={"username": "bob", "password": "pw123456", "role": "member"})
    other = client.__class__(client.app)  # fresh anonymous client
    other.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})
    assert other.put(f"/api/routes/{rid}/share", json={}).status_code == 403


def test_delete_route_cleans_up_share(client):
    _setup(client)
    rid = _route(client)["id"]
    tok = client.put(f"/api/routes/{rid}/share", json={}).json()["token"]

    from app import db
    from app.models import RouteShare
    from sqlmodel import Session, select

    assert client.delete(f"/api/routes/{rid}").status_code == 204
    with Session(db.engine) as s:
        got = s.exec(select(RouteShare).where(RouteShare.token == tok)).first()
        assert got is None
