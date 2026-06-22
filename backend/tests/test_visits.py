def _setup(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})
    cat = client.post("/api/categories", json={"name": "Food"}).json()["id"]
    poi = client.post("/api/pois", json={"name": "P", "lat": 1.0, "lng": 2.0, "category_id": cat}).json()
    return poi["id"]


def test_visit_uses_preferred_team_default(client):
    poi_id = _setup(client)
    me_id = client.get("/api/auth/me").json()["id"]
    team_id = client.post("/api/teams", json={"name": "family", "member_ids": [me_id]}).json()["id"]

    # set preferred team
    pref = client.patch("/api/auth/me/preferences", json={"preferred_team_id": team_id})
    assert pref.json()["preferred_team_id"] == team_id

    # mark visited without specifying team -> uses preferred
    visited = client.put(f"/api/pois/{poi_id}/visit", json={"rating": 5})
    assert visited.status_code == 200
    assert visited.json()["team_id"] == team_id
    assert visited.json()["rating"] == 5

    # overriding team is respected; upsert keeps a single record
    again = client.put(f"/api/pois/{poi_id}/visit", json={"team_id": None})
    assert again.json()["team_id"] is None
    assert len(client.get(f"/api/pois/{poi_id}/visits").json()) == 1

    # un-visit
    assert client.delete(f"/api/pois/{poi_id}/visit").status_code == 204
    assert client.get(f"/api/pois/{poi_id}/visits").json() == []


def test_visit_rating_out_of_range_rejected(client):
    poi_id = _setup(client)
    assert client.put(f"/api/pois/{poi_id}/visit", json={"rating": 99}).status_code == 422


def test_visit_missing_poi_404(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})
    assert client.put("/api/pois/9999/visit", json={}).status_code == 404
    assert client.get("/api/pois/9999/visits").status_code == 404


def test_preferences_rejects_unknown_team(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})
    assert client.patch("/api/auth/me/preferences", json={"preferred_team_id": 9999}).status_code == 404
