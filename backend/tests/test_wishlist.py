def _setup(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})
    cat = client.post("/api/categories", json={"name": "Food"}).json()["id"]
    return client.post("/api/pois", json={"name": "P", "lat": 1.0, "lng": 2.0, "category_id": cat}).json()["id"]


def test_wishlist_toggle(client):
    poi_id = _setup(client)
    assert client.put(f"/api/pois/{poi_id}/wishlist").status_code == 200
    assert len(client.get(f"/api/pois/{poi_id}/wishlist").json()) == 1
    # idempotent
    assert client.put(f"/api/pois/{poi_id}/wishlist").status_code == 200
    assert len(client.get(f"/api/pois/{poi_id}/wishlist").json()) == 1
    assert client.delete(f"/api/pois/{poi_id}/wishlist").status_code == 204
    assert client.get(f"/api/pois/{poi_id}/wishlist").json() == []
