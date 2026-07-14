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


def test_reject_disallowed_type_by_magic_bytes(client):
    rid = _route(client)
    # An HTML payload mislabeled as PDF is rejected on content sniff.
    bad = client.post(f"/api/routes/{rid}/attachments",
                      files={"file": ("x.pdf", io.BytesIO(b"<html>nope</html>"), "application/pdf")})
    assert bad.status_code == 415


def test_upload_requires_owner(client):
    rid = _route(client)
    client.post("/api/users", json={"username": "bob", "password": "pw123456"})
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})
    r = client.post(f"/api/routes/{rid}/attachments",
                    files={"file": ("h.pdf", io.BytesIO(PDF), "application/pdf")})
    assert r.status_code == 403
