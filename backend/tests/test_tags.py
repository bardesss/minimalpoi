from app.tags import remove_from, rename_in, tag_counts


class _P:
    def __init__(self, tags):
        self.tags = tags


def test_tag_counts_sorted_by_count_then_name():
    pois = [_P(["a", "b"]), _P(["a"]), _P(["c", "a"])]
    assert tag_counts(pois) == [
        {"tag": "a", "count": 3},
        {"tag": "b", "count": 1},
        {"tag": "c", "count": 1},
    ]


def test_rename_in_merges_and_dedupes():
    assert rename_in(["a", "b"], "a", "b") == ["b"]
    assert rename_in(["b", "a"], "a", "b") == ["b"]
    assert rename_in(["a", "c"], "a", "b") == ["b", "c"]


def test_remove_from_drops_tag():
    assert remove_from(["a", "b", "a"], "a") == ["b"]


def _setup(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})


def _poi(client, name, tags):
    return client.post("/api/pois", json={"name": name, "lat": 1.0, "lng": 2.0, "tags": tags})


def test_list_tags_endpoint(client):
    _setup(client)
    _poi(client, "A", ["food", "cafe"])
    _poi(client, "B", ["food"])
    body = client.get("/api/tags").json()
    assert body == [{"tag": "food", "count": 2}, {"tag": "cafe", "count": 1}]


def test_rename_tag_merges(client):
    _setup(client)
    _poi(client, "A", ["food", "eats"])
    _poi(client, "B", ["eats"])
    body = client.patch("/api/tags/rename", json={"old": "eats", "new": "food"}).json()
    assert body == [{"tag": "food", "count": 2}]


def test_rename_unknown_tag_404(client):
    _setup(client)
    _poi(client, "A", ["food"])
    assert client.patch("/api/tags/rename", json={"old": "nope", "new": "x"}).status_code == 404


def test_rename_empty_new_400(client):
    _setup(client)
    _poi(client, "A", ["food"])
    assert client.patch("/api/tags/rename", json={"old": "food", "new": "  "}).status_code == 400


def test_delete_tag(client):
    _setup(client)
    _poi(client, "A", ["food", "cafe"])
    body = client.request("DELETE", "/api/tags/food").json()
    assert body == [{"tag": "cafe", "count": 1}]


def test_tags_require_auth(client):
    assert client.get("/api/tags").status_code == 401
