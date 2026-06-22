def _setup(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})
    cat = client.post("/api/categories", json={"name": "Food"}).json()["id"]
    return client.post("/api/pois", json={"name": "P", "lat": 1.0, "lng": 2.0, "category_id": cat}).json()["id"]


def test_comment_thread(client):
    poi_id = _setup(client)
    created = client.post(f"/api/pois/{poi_id}/comments", json={"text": "lovely terrace"})
    assert created.status_code == 201
    body = created.json()
    assert body["text"] == "lovely terrace"
    assert body["username"] == "admin"

    listed = client.get(f"/api/pois/{poi_id}/comments").json()
    assert len(listed) == 1

    assert client.delete(f"/api/pois/{poi_id}/comments/{body['id']}").status_code == 204
    assert client.get(f"/api/pois/{poi_id}/comments").json() == []


def test_member_cannot_delete_others_comment(client):
    poi_id = _setup(client)
    admin_comment = client.post(f"/api/pois/{poi_id}/comments", json={"text": "admin note"}).json()
    client.post("/api/users", json={"username": "bob", "password": "pw"})
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw"})
    assert client.delete(f"/api/pois/{poi_id}/comments/{admin_comment['id']}").status_code == 403
