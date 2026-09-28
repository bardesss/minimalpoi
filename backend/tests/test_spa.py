import importlib
import shutil
from contextlib import contextmanager
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import spa_dist_dir


def test_spa_dist_dir_points_at_frontend_build():
    expected = Path(__file__).resolve().parents[2] / "frontend" / "dist"
    assert spa_dist_dir() == expected


def test_api_routes_still_work_without_a_build(client: TestClient):
    # The dev/CI tree has no frontend/dist; health must still respond as JSON.
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@contextmanager
def _spa_app(tmp_path, monkeypatch, files):
    """
    Reload `app.main` with an SPA dist present and yield its app.

    `files` maps dist-relative paths to contents. Only files that don't
    already exist are written, and only those (plus any directories this
    helper created) are removed afterwards, so the test behaves the same
    whether or not a local `frontend/dist` build is present (CI has none).
    """
    import app.db as db_module
    import app.config as config_module
    from app import main

    real_dist = spa_dist_dir()
    dist_existed_before = real_dist.exists()

    data_dir = tmp_path / "data"
    data_dir.mkdir()
    monkeypatch.setenv("MINIMALPOI_DATA_DIR", str(data_dir))
    monkeypatch.delenv("SECRET_KEY", raising=False)
    config_module.reset_config_cache()

    created = []
    assets_existed_before = (real_dist / "assets").exists()
    (real_dist / "assets").mkdir(parents=True, exist_ok=True)
    for rel, content in files.items():
        path = real_dist / rel
        if not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
            created.append(path)

    db_module.reset_engine()
    db_module.init_db()

    try:
        importlib.reload(main)
        yield main.app
    finally:
        if not dist_existed_before:
            shutil.rmtree(str(real_dist), ignore_errors=True)
        else:
            for path in created:
                path.unlink(missing_ok=True)
            if not assets_existed_before:
                shutil.rmtree(str(real_dist / "assets"), ignore_errors=True)

        config_module.reset_config_cache()
        db_module.reset_engine()
        importlib.reload(main)
        db_module.reset_engine()
        config_module.reset_config_cache()


def test_spa_active_branch_ordering(tmp_path, monkeypatch):
    """
    Exercises the active SPA-serving branch (frontend/dist/index.html exists).

    Verifies two critical properties:
      (a) The /api/health endpoint is NOT shadowed by the catch-all route —
          it returns JSON, not HTML.
      (b) An unknown client-side route is served with index.html (SPA
          fallback) and a text/html content type.
    """
    files = {
        "index.html": "<!doctype html><html><body>SPA</body></html>",
        # A root-level static asset (Vite copies public/ here) — must be served
        # as the real file, not shadowed by the SPA catch-all.
        "favicon.svg": '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    }
    with _spa_app(tmp_path, monkeypatch, files) as app, TestClient(app) as c:
        # (a) API route must NOT be shadowed by the SPA catch-all.
        health = c.get("/api/health")
        assert health.status_code == 200
        assert health.json() == {"status": "ok"}
        assert "application/json" in health.headers["content-type"]

        # (a2) A real file at the dist root (favicon.svg) must be served
        # as that file, NOT shadowed by the SPA catch-all (regression).
        fav = c.get("/favicon.svg")
        assert fav.status_code == 200
        assert "image/svg" in fav.headers["content-type"]
        assert "<svg" in fav.text

        # (a3) A traversal attempt must not escape dist; it falls back to
        # the SPA index rather than leaking a file from outside.
        assert "text/html" in c.get("/../app/main.py").headers["content-type"]

        # (b) Unknown client-side route must get the SPA index (a local
        # build's own index.html when one exists, else the fixture above).
        spa = c.get("/some/client/route")
        assert spa.status_code == 200
        assert "text/html" in spa.headers["content-type"]
        assert spa.text == (spa_dist_dir() / "index.html").read_text(encoding="utf-8")


def test_manifest_webmanifest_served_with_manifest_content_type(tmp_path, monkeypatch):
    """
    The web app manifest must be served with the
    `application/manifest+json` content type. Python's stdlib `mimetypes`
    module has no *portable* built-in mapping for the `.webmanifest`
    extension (some platforms' OS-level mime databases happen to know it,
    which would mask a missing registration in `main.py`), so this test
    forcibly clears any pre-existing mapping before importing/reloading
    `app.main` — the only thing that can make the assertion pass is
    `main.py` itself calling `mimetypes.add_type(...)` at import time.
    """
    import mimetypes

    # Simulate a platform/mime-database with no knowledge of `.webmanifest`,
    # regardless of what this machine's own mimetypes db already knows.
    monkeypatch.delitem(mimetypes.types_map, ".webmanifest", raising=False)
    assert mimetypes.guess_type("x.webmanifest") == (None, None)

    files = {
        "index.html": "<!doctype html><html><body>SPA</body></html>",
        "manifest.webmanifest": '{"name": "MinimalPOI"}',
    }
    # _spa_app reloads main.py, re-running its module-level mimetypes.add_type call.
    with _spa_app(tmp_path, monkeypatch, files) as app, TestClient(app) as c:
        resp = c.get("/manifest.webmanifest")
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("application/manifest+json")


def test_spa_index_is_served_no_cache_but_other_files_are_not(tmp_path, monkeypatch):
    """
    index.html references hashed chunk names, so it must be revalidated on
    every load (`Cache-Control: no-cache`) or an open tab keeps asking for
    chunks a new deploy removed. Other root files and hashed assets keep
    their default caching.
    """
    files = {
        "index.html": "<!doctype html><html><body>SPA</body></html>",
        "favicon.svg": '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
        "assets/zz-cache-test.js": "export {};",
    }
    with _spa_app(tmp_path, monkeypatch, files) as app, TestClient(app) as c:
        for url in ("/", "/some/client/route", "/index.html"):
            resp = c.get(url)
            assert resp.status_code == 200
            assert "text/html" in resp.headers["content-type"]
            assert resp.headers.get("cache-control") == "no-cache", url

        fav = c.get("/favicon.svg")
        assert fav.status_code == 200
        assert "no-cache" not in fav.headers.get("cache-control", "")

        asset = c.get("/assets/zz-cache-test.js")
        assert asset.status_code == 200
        assert "no-cache" not in asset.headers.get("cache-control", "")
