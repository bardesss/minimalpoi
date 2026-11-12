"""Restore into Postgres must advance the id sequences past the restored ids,
or the next ORM insert collides with a restored primary key."""
import io
import json
import os
import zipfile

import pytest

# Import models at collection time so every table is registered on
# SQLModel.metadata before the `client` fixture's drop_all runs (same
# convention as test_postgres_delete_flows.py).
from app import models  # noqa: F401

POSTGRES = (os.environ.get("TEST_POSTGRES_URL")
            or (os.environ.get("DATABASE_URL") if os.environ.get("DATABASE_URL", "").startswith(("postgres://", "postgresql")) else None))
pytestmark = pytest.mark.skipif(POSTGRES is None, reason="needs a real Postgres")

TS = "2020-01-01T00:00:00+00:00"


def _archive() -> bytes:
    from app.security import hash_password

    pw = hash_password("pw123456")
    users = [{"id": i, "username": "admin" if i == 1 else f"user{i}", "password_hash": pw,
              "role": "admin" if i == 1 else "member", "disabled": False, "token_version": 0,
              "created_at": TS} for i in range(1, 6)]
    data = {
        "version": 2,
        "users": users,
        "categories": [{"id": i, "name": f"Cat {i}", "color": "#4f46e5", "created_by": 1, "created_at": TS}
                       for i in range(1, 6)],
        "pois": [{"id": i, "name": f"Place {i}", "lat": 52.0, "lng": 4.0, "tags": [], "created_by": 1,
                  "created_at": TS, "updated_at": TS} for i in range(1, 6)],
        "comments": [{"id": i, "poi_id": 1, "user_id": 1, "text": f"c{i}", "created_at": TS}
                     for i in range(1, 6)],
        "settings": None,
    }
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("backup.json", json.dumps(data))
    return buf.getvalue()


def test_create_after_restore_does_not_collide(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    res = client.post("/api/restore", files={"file": ("b.zip", _archive(), "application/zip")})
    assert res.status_code == 200, res.text

    client.cookies.clear()
    assert client.post("/api/auth/login", json={"username": "admin", "password": "pw123456"}).status_code == 200

    poi = client.post("/api/pois", json={"name": "New", "lat": 1.0, "lng": 1.0})
    assert poi.status_code == 201, poi.text
    assert poi.json()["id"] > 5
    cat = client.post("/api/categories", json={"name": "New"})
    assert cat.status_code == 201, cat.text
    user = client.post("/api/users", json={"username": "newbie", "password": "pw123456"})
    assert user.status_code == 201, user.text
    comment = client.post(f"/api/pois/{poi.json()['id']}/comments", json={"text": "hi"})
    assert comment.status_code == 201, comment.text
