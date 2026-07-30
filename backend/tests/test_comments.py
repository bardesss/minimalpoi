def _setup(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
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
    client.post("/api/users", json={"username": "bob", "password": "pw123456"})
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})
    assert client.delete(f"/api/pois/{poi_id}/comments/{admin_comment['id']}").status_code == 403


def test_edit_own_comment(client):
    poi_id = _setup(client)
    c = client.post(f"/api/pois/{poi_id}/comments", json={"text": "frist"}).json()
    res = client.patch(f"/api/pois/{poi_id}/comments/{c['id']}", json={"text": "fixed typo"})
    assert res.status_code == 200
    assert res.json()["text"] == "fixed typo"
    assert client.get(f"/api/pois/{poi_id}/comments").json()[0]["text"] == "fixed typo"


def test_member_cannot_edit_others_comment(client):
    poi_id = _setup(client)
    admin_comment = client.post(f"/api/pois/{poi_id}/comments", json={"text": "admin note"}).json()
    client.post("/api/users", json={"username": "bob", "password": "pw123456"})
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})
    assert client.patch(f"/api/pois/{poi_id}/comments/{admin_comment['id']}", json={"text": "hacked"}).status_code == 403


def test_edit_missing_comment_404(client):
    poi_id = _setup(client)
    assert client.patch(f"/api/pois/{poi_id}/comments/9999", json={"text": "x"}).status_code == 404


def test_list_comments_resolves_authors_batched(client):
    poi_id = _setup(client)  # admin is logged in
    client.post(f"/api/pois/{poi_id}/comments", json={"text": "from admin"})
    client.post("/api/users", json={"username": "bob", "password": "pw123456"})
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})
    client.post(f"/api/pois/{poi_id}/comments", json={"text": "from bob"})

    listed = client.get(f"/api/pois/{poi_id}/comments").json()
    authors = {c["text"]: c["username"] for c in listed}
    assert authors == {"from admin": "admin", "from bob": "bob"}
