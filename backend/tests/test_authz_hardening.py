"""Auth/authz hardening (audit batch 2)."""


def _admin(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})


def _member(client, name="bob"):
    client.post("/api/users", json={"username": name, "password": "pw123456"})
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": name, "password": "pw123456"})


# ── password policy ──────────────────────────────────────────────────────────

def test_setup_rejects_short_password(client):
    assert client.post("/api/auth/setup", json={"username": "admin", "password": "short"}).status_code == 422


def test_setup_rejects_blank_username(client):
    assert client.post("/api/auth/setup", json={"username": "   ", "password": "pw123456"}).status_code == 422


def test_create_user_rejects_short_password(client):
    _admin(client)
    assert client.post("/api/users", json={"username": "bob", "password": "short"}).status_code == 422


# ── reserved username ────────────────────────────────────────────────────────

def test_setup_rejects_reserved_username(client):
    assert client.post("/api/auth/setup", json={"username": "__trip_sync__", "password": "pw123456"}).status_code == 400


def test_create_user_rejects_reserved_username(client):
    _admin(client)
    assert client.post("/api/users", json={"username": "__TRIP_SYNC__", "password": "pw123456"}).status_code == 400


# ── owner / admin checks ─────────────────────────────────────────────────────

def test_member_cannot_edit_or_delete_anothers_poi(client):
    _admin(client)
    poi_id = client.post("/api/pois", json={"name": "Admin spot", "lat": 1.0, "lng": 2.0}).json()["id"]
    _member(client)
    assert client.patch(f"/api/pois/{poi_id}", json={"name": "hijacked"}).status_code == 403
    assert client.delete(f"/api/pois/{poi_id}").status_code == 403


def test_owner_and_admin_can_edit_poi(client):
    _admin(client)
    poi_id = client.post("/api/pois", json={"name": "Admin spot", "lat": 1.0, "lng": 2.0}).json()["id"]
    # admin (also the owner here) can edit
    assert client.patch(f"/api/pois/{poi_id}", json={"name": "renamed"}).status_code == 200
    # a member editing their own POI works
    _member(client)
    mine = client.post("/api/pois", json={"name": "Bob spot", "lat": 3.0, "lng": 4.0}).json()["id"]
    assert client.patch(f"/api/pois/{mine}", json={"name": "bob renamed"}).status_code == 200


def test_member_cannot_rename_or_delete_tags(client):
    _admin(client)
    client.post("/api/pois", json={"name": "P", "lat": 1.0, "lng": 2.0, "tags": ["food"]})
    _member(client)
    assert client.patch("/api/tags/rename", json={"old": "food", "new": "grub"}).status_code == 403
    assert client.delete("/api/tags/food").status_code == 403


# ── session invalidation on password change ──────────────────────────────────

def test_password_change_revokes_the_current_session(client):
    _admin(client)
    me = client.get("/api/auth/me")
    assert me.status_code == 200
    admin_id = me.json()["id"]
    # Change own password → token_version bumps. The cookie we still hold was
    # minted with the old version, so the very next request is now unauthorized.
    assert client.patch(f"/api/users/{admin_id}", json={"password": "newpw12345"}).status_code == 200
    assert client.get("/api/auth/me").status_code == 401


# ── cookie Secure auto-enables on HTTPS ──────────────────────────────────────

def test_cookie_secure_auto_enabled_behind_https_proxy(client):
    _admin(client)
    client.post("/api/auth/logout")
    resp = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "pw123456"},
        headers={"X-Forwarded-Proto": "https"},
    )
    assert resp.status_code == 200
    assert "secure" in resp.headers.get("set-cookie", "").lower()
