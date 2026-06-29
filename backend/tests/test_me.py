def _setup(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    cat = client.post("/api/categories", json={"name": "Food"}).json()["id"]

    def make_poi(name):
        return client.post(
            "/api/pois", json={"name": name, "lat": 1.0, "lng": 2.0, "category_id": cat}
        ).json()["id"]

    return make_poi


def test_my_visits_returns_only_callers_rows(client):
    make_poi = _setup(client)
    poi_a = make_poi("A")
    poi_b = make_poi("B")

    # admin (currently logged in) visits A
    assert client.put(f"/api/pois/{poi_a}/visit", json={"rating": 4}).status_code == 200

    # create a second user and log in as them
    client.post("/api/users", json={"username": "bob", "password": "pw123456"})
    client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})

    # bob visits B; /api/me/visits shows only bob's row
    assert client.put(f"/api/pois/{poi_b}/visit", json={"rating": 5}).status_code == 200
    bob_visits = client.get("/api/me/visits").json()
    assert [v["poi_id"] for v in bob_visits] == [poi_b]

    # back to admin: only the admin's row
    client.post("/api/auth/login", json={"username": "admin", "password": "pw123456"})
    admin_visits = client.get("/api/me/visits").json()
    assert [v["poi_id"] for v in admin_visits] == [poi_a]
    assert admin_visits[0]["rating"] == 4


def test_my_visits_requires_auth(client):
    assert client.get("/api/me/visits").status_code == 401
