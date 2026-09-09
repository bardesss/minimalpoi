def _setup_admin(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})


def test_settings_defaults_and_secret_handling(client):
    _setup_admin(client)
    got = client.get("/api/settings").json()
    assert got["map_tile_url"] == "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
    assert got["nominatim_url"] == "https://nominatim.openstreetmap.org"
    assert got["google_api_key_set"] is False

    # set a Google API key; it is stored but never returned
    patched = client.patch("/api/settings", json={
        "nominatim_url": "https://nominatim.lan",
        "google_api_key": "s3cret",
    }).json()
    assert patched["nominatim_url"] == "https://nominatim.lan"
    assert patched["google_api_key_set"] is True
    assert "google_api_key" not in patched
    assert "google_api_key_enc" not in patched

    # empty string clears the key
    cleared = client.patch("/api/settings", json={"google_api_key": ""}).json()
    assert cleared["google_api_key_set"] is False


def test_settings_admin_only_members_use_map_endpoint(client):
    _setup_admin(client)
    client.post("/api/users", json={"username": "bob", "password": "pw123456"})
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})
    # Full settings (Nominatim host, secrets-set flags) are admin-only.
    assert client.get("/api/settings").status_code == 403
    assert client.patch("/api/settings", json={"map_tile_url": "x"}).status_code == 403
    # Members read the map-only payload to render the map — and it leaks nothing.
    m = client.get("/api/settings/map")
    assert m.status_code == 200
    body = m.json()
    assert "map_tile_url" in body
    assert "google_api_key_set" not in body and "nominatim_url" not in body


def test_google_api_key_is_encrypted_and_recoverable(client, data_dir):
    _setup_admin(client)
    client.patch("/api/settings", json={"google_api_key": "s3cret"})
    from sqlmodel import Session
    from app import db
    from app.crypto import decrypt
    from app.models import Settings
    with Session(db.engine) as session:
        row = session.get(Settings, 1)
        assert row.google_api_key_enc and row.google_api_key_enc != "s3cret"
        assert decrypt(row.google_api_key_enc) == "s3cret"


def test_cookie_secure_default_off(client):
    """Login response should NOT set Secure flag by default (LAN/HTTP use)."""
    _setup_admin(client)
    client.post("/api/auth/logout")
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "pw123456"})
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
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "pw123456"})
    assert resp.status_code == 200
    set_cookie = resp.headers.get("set-cookie", "")
    assert "secure" in set_cookie.lower()


def test_routes_enabled_defaults_false_and_toggles(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    assert client.get("/api/settings").json()["routes_enabled"] is False
    # Members can read the flag via the public map-settings endpoint.
    assert client.get("/api/settings/map").json()["routes_enabled"] is False
    client.patch("/api/settings", json={"routes_enabled": True})
    assert client.get("/api/settings").json()["routes_enabled"] is True
    assert client.get("/api/settings/map").json()["routes_enabled"] is True
