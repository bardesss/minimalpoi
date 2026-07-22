import io

PDF = b"%PDF-1.4\n%test\n"


def _route(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    client.patch("/api/settings", json={"routes_enabled": True})
    return client.post("/api/routes", json={"name": "NL", "start_date": "2026-07-14"}).json()["id"]


def test_upload_download_delete_pdf(client):
    rid = _route(client)
    up = client.post(f"/api/routes/{rid}/attachments",
                     files={"file": ("hotel.pdf", io.BytesIO(PDF), "application/pdf")})
    assert up.status_code == 201
    aid = up.json()["id"]
    assert up.json()["filename"] == "hotel.pdf"
    assert up.json()["content_type"] == "application/pdf"

    got = client.get(f"/api/routes/{rid}/attachments/{aid}")
    assert got.status_code == 200 and got.content == PDF

    assert client.delete(f"/api/routes/{rid}/attachments/{aid}").status_code == 204


def test_route_detail_lists_attachments(client):
    rid = _route(client)
    client.post(f"/api/routes/{rid}/attachments",
                files={"file": ("hotel.pdf", io.BytesIO(PDF), "application/pdf")})
    detail = client.get(f"/api/routes/{rid}").json()
    assert len(detail["attachments"]) == 1
    assert detail["attachments"][0]["filename"] == "hotel.pdf"
    assert detail["attachments"][0]["node_id"] is None


def test_reject_disallowed_type_by_magic_bytes(client):
    rid = _route(client)
    # An HTML payload mislabeled as PDF is rejected on content sniff.
    bad = client.post(f"/api/routes/{rid}/attachments",
                      files={"file": ("x.pdf", io.BytesIO(b"<html>nope</html>"), "application/pdf")})
    assert bad.status_code == 415


def test_delete_node_removes_its_attachments(client):
    from app import attachments as att

    rid = _route(client)
    nid = client.post(f"/api/routes/{rid}/nodes",
                      json={"kind": "stop", "name": "S", "lat": 1.0, "lng": 1.0}).json()["nodes"][0]["id"]
    up = client.post(f"/api/routes/{rid}/attachments",
                     files={"file": ("t.pdf", io.BytesIO(PDF), "application/pdf")},
                     data={"node_id": str(nid)})
    assert up.status_code == 201
    aid = up.json()["id"]
    assert up.json()["node_id"] == nid
    # File exists on disk before the node is deleted.
    assert list(att.attachments_dir().iterdir())

    assert client.delete(f"/api/routes/{rid}/nodes/{nid}").status_code == 200

    # Row is gone (download 404s) and the file is removed from disk.
    assert client.get(f"/api/routes/{rid}/attachments/{aid}").status_code == 404
    assert list(att.attachments_dir().iterdir()) == []


def test_upload_requires_owner(client):
    rid = _route(client)
    client.post("/api/users", json={"username": "bob", "password": "pw123456"})
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})
    r = client.post(f"/api/routes/{rid}/attachments",
                    files={"file": ("h.pdf", io.BytesIO(PDF), "application/pdf")})
    assert r.status_code == 403


def test_attachments_hidden_from_non_team_members(client):
    """A non-member can see the shared route but not its attachments (list is
    empty) and cannot download them."""
    rid = _route(client)  # admin owns it, no team
    aid = client.post(f"/api/routes/{rid}/attachments",
                      files={"file": ("hotel.pdf", io.BytesIO(PDF), "application/pdf")}).json()["id"]
    client.post("/api/users", json={"username": "bob", "password": "pw123456"})
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})
    detail = client.get(f"/api/routes/{rid}").json()
    assert detail["attachments"] == []                                   # not listed
    assert client.get(f"/api/routes/{rid}/attachments/{aid}").status_code == 403  # not downloadable


def test_team_member_sees_and_downloads_attachments(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    client.patch("/api/settings", json={"routes_enabled": True})
    bob = client.post("/api/users", json={"username": "bob", "password": "pw123456"}).json()
    team = client.post("/api/teams", json={"name": "Crew", "member_ids": [bob["id"]]}).json()
    rid = client.post("/api/routes",
                      json={"name": "T", "start_date": "2026-07-14", "team_id": team["id"]}).json()["id"]
    aid = client.post(f"/api/routes/{rid}/attachments",
                      files={"file": ("hotel.pdf", io.BytesIO(PDF), "application/pdf")}).json()["id"]
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})
    detail = client.get(f"/api/routes/{rid}").json()
    assert len(detail["attachments"]) == 1
    got = client.get(f"/api/routes/{rid}/attachments/{aid}")
    assert got.status_code == 200 and got.content == PDF


def test_purge_orphan_route_level_attachments(client):
    """Route-level (node_id NULL) attachments are unreachable now; init-time
    purge deletes them and their files, keeping node-scoped ones."""
    from sqlmodel import Session, select

    from app import attachments as att
    from app import db
    from app.models import RouteAttachment

    rid = _route(client)
    node = client.post(f"/api/routes/{rid}/nodes",
                       json={"kind": "stop", "name": "B", "lat": 1, "lng": 2}).json()["nodes"][0]["id"]
    # A node-scoped attachment that must survive the purge.
    kept = client.post(f"/api/routes/{rid}/attachments",
                       files={"file": ("keep.pdf", io.BytesIO(PDF), "application/pdf")},
                       data={"node_id": str(node)}).json()["id"]

    # Inject a route-level orphan (row + file) directly.
    stored = att.save(PDF, ".pdf")
    with Session(db.engine) as s:
        s.add(RouteAttachment(route_id=rid, node_id=None, filename="orphan.pdf",
                              stored_filename=stored, content_type="application/pdf",
                              size=len(PDF), uploaded_by=1))
        s.commit()

    db._purge_orphan_route_attachments()

    with Session(db.engine) as s:
        rows = s.exec(select(RouteAttachment)).all()
    assert [r.id for r in rows] == [kept]                       # orphan gone, node one kept
    assert not (att.attachments_dir() / stored).exists()        # its file removed
