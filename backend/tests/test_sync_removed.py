"""The TRIP sync feature is gone; its endpoints must not come back."""
import pytest


@pytest.mark.parametrize("method,path", [
    ("post", "/api/sync/now"),
    ("get", "/api/sync/status"),
    ("get", "/api/sync/conflicts"),
    ("post", "/api/sync/resolve"),
])
def test_sync_endpoints_are_gone(client, method, path):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    assert getattr(client, method)(path).status_code == 404


def test_no_trip_module_is_importable():
    with pytest.raises(ModuleNotFoundError):
        __import__("app.trip")
