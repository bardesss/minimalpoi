def _setup_admin(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})


def test_settings_defaults_and_secret_handling(client):
    _setup_admin(client)
    got = client.get("/api/settings").json()
    assert got["map_tile_url"]  # has a default
    assert got["trip_conflict_policy"] == "minimalpoi_wins"
    assert got["trip_password_set"] is False

    # set a TRIP password; it is stored but never returned
    patched = client.patch("/api/settings", json={
        "trip_base_url": "https://trip.lan",
        "trip_username": "me",
        "trip_password": "s3cret",
    }).json()
    assert patched["trip_username"] == "me"
    assert patched["trip_password_set"] is True
    assert "trip_password" not in patched
    assert "trip_password_enc" not in patched

    # empty string clears the password
    cleared = client.patch("/api/settings", json={"trip_password": ""}).json()
    assert cleared["trip_password_set"] is False


def test_settings_patch_admin_only(client):
    _setup_admin(client)
    client.post("/api/users", json={"username": "bob", "password": "pw"})
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw"})
    assert client.get("/api/settings").status_code == 200      # readable by members
    assert client.patch("/api/settings", json={"map_tile_url": "x"}).status_code == 403


def test_trip_password_is_encrypted_and_recoverable(client, data_dir):
    _setup_admin(client)
    client.patch("/api/settings", json={"trip_password": "s3cret"})
    from sqlmodel import Session
    from app import db
    from app.crypto import decrypt
    from app.models import Settings
    with Session(db.engine) as session:
        row = session.get(Settings, 1)
        assert row.trip_password_enc and row.trip_password_enc != "s3cret"
        assert decrypt(row.trip_password_enc) == "s3cret"


def test_cookie_secure_default_off(client):
    """Login response should NOT set Secure flag by default (LAN/HTTP use)."""
    _setup_admin(client)
    client.post("/api/auth/logout")
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "pw"})
    assert resp.status_code == 200
    set_cookie = resp.headers.get("set-cookie", "")
    assert "secure" not in set_cookie.lower()


def test_cookie_secure_enabled_when_setting_on(client):
    """When admin PATCHes cookie_secure=true, subsequent login Set-Cookie includes Secure."""
    _setup_admin(client)
    # Admin enables secure cookies
    client.patch("/api/settings", json={"cookie_secure": True})
    # Logout then login again
    client.post("/api/auth/logout")
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "pw"})
    assert resp.status_code == 200
    set_cookie = resp.headers.get("set-cookie", "")
    assert "secure" in set_cookie.lower()
