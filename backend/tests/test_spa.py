import importlib
import shutil
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


def test_spa_active_branch_ordering(tmp_path, monkeypatch):
    """
    Exercises the active SPA-serving branch (frontend/dist/index.html exists).

    Verifies two critical properties:
      (a) The /api/health endpoint is NOT shadowed by the catch-all route —
          it returns JSON, not HTML.
      (b) An unknown client-side route is served with index.html (SPA
          fallback) and a text/html content type.

    Strategy: temporarily create frontend/dist/ (gitignored build-artifact
    directory that does not exist in the dev tree) so that the module-level
    conditional in main.py evaluates to True after importlib.reload().
    The directory is removed in the finally block; git state is unaffected
    because dist/ is listed in .gitignore.
    """
    import app.db as db_module
    import app.config as config_module
    from app import main

    real_dist = spa_dist_dir()  # e.g. <repo>/frontend/dist

    # Guard: if dist already exists (e.g. in a CI build), skip creation but
    # still verify behaviour.
    dist_existed_before = real_dist.exists()

    # --- set up an isolated temp data dir (mirrors the data_dir fixture) ---
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    monkeypatch.setenv("MINIMALPOI_DATA_DIR", str(data_dir))
    monkeypatch.delenv("SECRET_KEY", raising=False)
    config_module.reset_config_cache()

    if not dist_existed_before:
        # Create the minimal dist tree so main.py's module-level check passes.
        (real_dist / "assets").mkdir(parents=True, exist_ok=True)
        (real_dist / "index.html").write_text(
            "<!doctype html><html><body>SPA</body></html>", encoding="utf-8"
        )

    # Initialise the DB before reload so lifespan startup succeeds.
    db_module.reset_engine()
    db_module.init_db()

    try:
        # Reload the module so the module-level conditional re-evaluates with
        # the dist tree present, registering the /assets mount and the
        # /{full_path:path} catch-all route.
        importlib.reload(main)

        with TestClient(main.app) as c:
            # (a) API route must NOT be shadowed by the SPA catch-all.
            health = c.get("/api/health")
            assert health.status_code == 200
            assert health.json() == {"status": "ok"}
            assert "application/json" in health.headers["content-type"]

            # (b) Unknown client-side route must get the SPA index.
            spa = c.get("/some/client/route")
            assert spa.status_code == 200
            assert "text/html" in spa.headers["content-type"]
            if dist_existed_before:
                # A real build is present — assert the served body is that index.html.
                expected_index = (real_dist / "index.html").read_text(encoding="utf-8")
                assert spa.text == expected_index
            else:
                # We created the minimal fixture above; assert its marker.
                assert "SPA" in spa.text
    finally:
        # Remove the temporary dist tree (only if we created it).
        if not dist_existed_before and real_dist.exists():
            shutil.rmtree(str(real_dist))

        # Restore the canonical app.main to its no-dist state so other tests
        # that use the real app (via the `client` fixture) are unaffected.
        config_module.reset_config_cache()
        db_module.reset_engine()
        importlib.reload(main)
        db_module.reset_engine()
        config_module.reset_config_cache()
