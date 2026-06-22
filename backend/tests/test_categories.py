def _setup_admin(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})


def test_category_crud(client):
    _setup_admin(client)
    created = client.post(
        "/api/categories",
        json={"name": "Food", "color": "#2F9E63", "icon": "utensils"},
    )
    assert created.status_code == 201
    cat = created.json()
    assert cat["name"] == "Food"
    assert cat["icon"] == "utensils"
    assert cat["trip_sync_status"] == "local_only"
    assert cat["trip_category_id"] is None

    updated = client.patch(f"/api/categories/{cat['id']}", json={"color": "#E0A22A"})
    assert updated.json()["color"] == "#E0A22A"

    assert len(client.get("/api/categories").json()) == 1
    assert client.delete(f"/api/categories/{cat['id']}").status_code == 204
