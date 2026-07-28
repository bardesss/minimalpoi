def _setup_admin(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})


def test_sync_system_user_is_hidden_and_protected(client):
    import app.db as _db
    from sqlmodel import Session, select

    from app.models import SYNC_USERNAME, User, sync_system_user

    _setup_admin(client)
    with Session(_db.engine) as s:
        sync_system_user(s)  # lazily created when TRIP sync first runs
        sid = s.exec(select(User).where(User.username == SYNC_USERNAME)).first().id

    # Hidden from the admin users list and the team-candidate picker.
    assert all(u["username"] != SYNC_USERNAME for u in client.get("/api/users").json())
    assert all(c["username"] != SYNC_USERNAME for c in client.get("/api/teams/candidates").json())

    # Protected from edit/delete so TRIP-import attribution can't be broken.
    assert client.patch(f"/api/users/{sid}", json={"role": "admin"}).status_code == 403
    assert client.delete(f"/api/users/{sid}").status_code == 403


def test_admin_can_manage_users(client):
    _setup_admin(client)

    created = client.post("/api/users", json={"username": "bob", "password": "pw123456"})
    assert created.status_code == 201
    bob_id = created.json()["id"]
    assert created.json()["role"] == "member"

    # duplicate username rejected
    assert client.post("/api/users", json={"username": "bob", "password": "pw123456"}).status_code == 409

    # list shows both
    assert len(client.get("/api/users").json()) == 2

    # disable bob, then bob cannot log in
    assert client.patch(f"/api/users/{bob_id}", json={"disabled": True}).status_code == 200
    client.post("/api/auth/logout")
    assert client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"}).status_code == 401


def test_non_admin_forbidden(client):
    _setup_admin(client)
    client.post("/api/users", json={"username": "bob", "password": "pw123456"})
    client.post("/api/auth/logout")
    login_resp = client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})
    assert login_resp.status_code == 200
    assert client.get("/api/users").status_code == 403
    assert client.post("/api/users", json={"username": "x", "password": "y"}).status_code == 403
    assert client.patch("/api/users/1", json={}).status_code == 403
    assert client.delete("/api/users/1").status_code == 403


def test_cannot_delete_last_admin(client):
    _setup_admin(client)
    admin_id = client.get("/api/auth/me").json()["id"]
    assert client.delete(f"/api/users/{admin_id}").status_code == 400


def test_patch_and_delete_missing_user_404(client):
    _setup_admin(client)
    assert client.patch("/api/users/9999", json={"role": "admin"}).status_code == 404
    assert client.delete("/api/users/9999").status_code == 404


def test_cannot_demote_or_disable_last_admin(client):
    _setup_admin(client)
    admin_id = client.get("/api/auth/me").json()["id"]
    assert client.patch(f"/api/users/{admin_id}", json={"role": "member"}).status_code == 400
    assert client.patch(f"/api/users/{admin_id}", json={"disabled": True}).status_code == 400


def test_deleting_creator_reassigns_content_to_sentinel(client):
    _setup_admin(client)

    bob_id = client.post("/api/users", json={"username": "bob", "password": "pw123456"}).json()["id"]

    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})
    poi_id = client.post(
        "/api/pois",
        json={"name": "P", "lat": 1.0, "lng": 2.0},
    ).json()["id"]

    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "admin", "password": "pw123456"})
    assert client.delete(f"/api/users/{bob_id}").status_code == 204

    from sqlmodel import Session, select
    from app import db
    from app.models import POI, User, DELETED_USERNAME

    with Session(db.engine) as s:
        sentinel = s.exec(select(User).where(User.username == DELETED_USERNAME)).first()
        assert sentinel is not None
        poi = s.get(POI, poi_id)
        assert poi is not None and poi.created_by == sentinel.id


def test_sentinel_hidden_from_user_list_and_unmanageable(client):
    _setup_admin(client)

    bob_id = client.post("/api/users", json={"username": "bob", "password": "pw123456"}).json()["id"]
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})
    client.post("/api/pois", json={"name": "P", "lat": 1.0, "lng": 2.0})

    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "admin", "password": "pw123456"})
    assert client.delete(f"/api/users/{bob_id}").status_code == 204

    r = client.get("/api/users")
    assert all(u["username"] != "__deleted_user__" for u in r.json())

    from sqlmodel import Session, select
    from app import db
    from app.models import User, DELETED_USERNAME

    with Session(db.engine) as s:
        sentinel = s.exec(select(User).where(User.username == DELETED_USERNAME)).first()
        assert sentinel is not None
        sid = sentinel.id

    assert client.patch(f"/api/users/{sid}", json={"role": "admin"}).status_code == 403
    assert client.delete(f"/api/users/{sid}").status_code == 403
    assert client.post(
        "/api/users", json={"username": DELETED_USERNAME, "password": "pw123456"}
    ).status_code == 400
    assert client.post(
        "/api/auth/login", json={"username": DELETED_USERNAME, "password": "!"}
    ).status_code == 401


def test_delete_user_cascades_children(client):
    _setup_admin(client)

    # Admin creates a category and POI
    cat_id = client.post("/api/categories", json={"name": "Food"}).json()["id"]
    poi_id = client.post(
        "/api/pois",
        json={"name": "P", "lat": 1.0, "lng": 2.0, "category_id": cat_id},
    ).json()["id"]

    # Admin creates bob
    bob_id = client.post("/api/users", json={"username": "bob", "password": "pw123456"}).json()["id"]

    # Bob logs in and adds visit, comment
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw123456"})
    assert client.put(f"/api/pois/{poi_id}/visit", json={}).status_code == 200
    assert client.post(f"/api/pois/{poi_id}/comments", json={"text": "from bob"}).status_code == 201

    # Admin logs back in and deletes bob
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "admin", "password": "pw123456"})
    assert client.delete(f"/api/users/{bob_id}").status_code == 204

    from sqlmodel import Session, select
    from app import db
    from app.models import Comment, TeamMember, Visit
    with Session(db.engine) as session:
        assert session.exec(select(Visit).where(Visit.user_id == bob_id)).all() == []
        assert session.exec(select(Comment).where(Comment.user_id == bob_id)).all() == []
        assert session.exec(select(TeamMember).where(TeamMember.user_id == bob_id)).all() == []
