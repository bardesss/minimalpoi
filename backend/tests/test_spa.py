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
