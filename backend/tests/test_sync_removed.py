"""The TRIP sync feature is gone; its endpoints must not come back."""
import pytest

from app.main import app, spa_dist_dir

SYNC_PATHS = {
    "/api/sync/now",
    "/api/sync/status",
    "/api/sync/conflicts",
    "/api/sync/resolve",
}


def test_sync_routes_are_not_registered():
    """Precondition-free proof the sync routes are gone.

    Unlike an HTTP-status assertion, this doesn't depend on whether
    frontend/dist exists: backend/app/main.py only registers the SPA
    catch-all (`/{full_path:path}`) when frontend/dist/index.html is
    present, and when it is, an unmatched GET falls through to that
    catch-all (200) instead of 404, and an unmatched non-GET 405s (see
    main.py's comment above the catch-all route, and test_spa.py). Reading
    the route table directly sidesteps that entirely.
    """
    registered_paths = {getattr(route, "path", None) for route in app.routes}
    assert not (SYNC_PATHS & registered_paths)


@pytest.mark.parametrize("method,path", [
    ("post", "/api/sync/now"),
    ("get", "/api/sync/status"),
    ("get", "/api/sync/conflicts"),
    ("post", "/api/sync/resolve"),
])
def test_sync_endpoints_are_gone(client, method, path):
    # This 404 assertion holds only when frontend/dist is absent: with it
    # present, main.py's SPA catch-all answers unmatched GETs with 200 and
    # unmatched non-GETs with 405 (see test_spa.py, which documents the
    # same precondition). test_sync_routes_are_not_registered above proves
    # the routes are gone regardless of that precondition.
    if (spa_dist_dir() / "index.html").exists():
        pytest.skip("frontend/dist is present: the SPA catch-all shadows unmatched paths")
    assert getattr(client, method)(path).status_code == 404


def test_no_trip_module_is_importable():
    with pytest.raises(ModuleNotFoundError):
        __import__("app.trip")
