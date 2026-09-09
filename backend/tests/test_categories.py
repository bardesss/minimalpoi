def _setup_admin(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})


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

    updated = client.patch(f"/api/categories/{cat['id']}", json={"color": "#E0A22A"})
    assert updated.json()["color"] == "#E0A22A"

    assert len(client.get("/api/categories").json()) == 1
    assert client.delete(f"/api/categories/{cat['id']}").status_code == 204


def test_delete_category_nulls_referencing_pois(client):
    _setup_admin(client)
    cat = client.post("/api/categories", json={"name": "Food", "color": "#fff"}).json()
    poi = client.post("/api/pois", json={"name": "X", "lat": 1.0, "lng": 2.0, "category_id": cat["id"]}).json()
    assert client.delete(f"/api/categories/{cat['id']}").status_code == 204
    got = client.get(f"/api/pois/{poi['id']}").json()
    assert got["category_id"] is None
