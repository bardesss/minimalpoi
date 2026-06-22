# MinimalPOI — Plan 1: Backend Foundation & Core API

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the FastAPI backend foundation for MinimalPOI — config/secret bootstrap, SQLite via SQLModel, first-run admin setup, JWT-cookie auth with roles, and CRUD for the shared domain (users, teams, categories, POIs with duplicate detection, visits, wishlist, comments, settings).

**Architecture:** A single FastAPI app serving a JSON REST API. SQLModel maps tables to SQLite stored under a `data/` dir. Auth is username/password → a signed JWT in an httpOnly cookie; the JWT signing key is auto-generated and persisted to `data/secret.key` on first boot. All domain data is shared across users (no per-user silos); `created_by` records attribution. TRIP credentials in the settings singleton are encrypted at rest with a Fernet key derived from the app secret. This plan stops at a fully tested API; enrichment, TRIP sync, the frontend, and Docker come in later plans.

**Tech Stack:** Python 3.12+, FastAPI, SQLModel (SQLite), Uvicorn, PyJWT, `bcrypt`, `cryptography` (Fernet), pytest + Starlette `TestClient` (httpx).

## Global Constraints

- Python **3.12+**.
- **No required environment variables.** The JWT signing secret is generated on first boot and persisted to `data/secret.key`; an optional `SECRET_KEY` env var overrides it.
- All persistent state lives under a single **`data/`** directory (`data/minimalpoi.db`, `data/secret.key`, later `data/images/`).
- **TDD**: write the failing test first, watch it fail, implement minimally, watch it pass, commit.
- Data is **shared** across all users; there are no per-user POI lists. `created_by` is stored for attribution only.
- Roles: `admin` and `member`. Admin-only: user management and settings.
- TRIP `password` is **encrypted at rest** and never returned to clients.
- Run commands from the `backend/` directory unless stated otherwise.

---

## File Structure

```
backend/
  pyproject.toml                 # deps + pytest config
  app/
    __init__.py
    main.py                      # FastAPI app, router registration
    config.py                    # data dir, secret load/generate, Fernet key
    crypto.py                    # encrypt/decrypt helpers (Fernet)
    db.py                        # engine, init_db, get_session
    security.py                  # password hash/verify, JWT encode/decode
    deps.py                      # SessionDep, current-user / require-admin deps
    models.py                    # all SQLModel tables + enums
    schemas.py                   # Pydantic request/response models
    routers/
      __init__.py
      auth.py                    # /api/auth: setup-status, setup, login, logout, me
      users.py                   # /api/users: admin user management
      teams.py                   # /api/teams
      categories.py              # /api/categories
      pois.py                    # /api/pois (+ duplicate check)
      visits.py                  # /api/pois/{id}/visit
      wishlist.py                # /api/pois/{id}/wishlist
      comments.py                # /api/pois/{id}/comments
      settings.py                # /api/settings (admin)
  tests/
    conftest.py                  # app + client + isolated temp DB fixtures
    test_config.py
    test_security.py
    test_auth.py
    test_users.py
    test_teams.py
    test_categories.py
    test_pois.py
    test_visits.py
    test_wishlist.py
    test_comments.py
    test_settings.py
```

Responsibilities are split by domain concern. `models.py` and `schemas.py` are shared but each router owns one resource. Files that change together (a resource's table, schema, router, tests) are introduced in the same task.

---

### Task 1: Project scaffold, config, and secret bootstrap

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/__init__.py` (empty)
- Create: `backend/app/config.py`
- Create: `backend/app/crypto.py`
- Create: `backend/app/main.py`
- Create: `backend/tests/__init__.py` (empty)
- Create: `backend/tests/conftest.py`
- Test: `backend/tests/test_config.py`

**Interfaces:**
- Produces:
  - `app.config.get_data_dir() -> pathlib.Path`
  - `app.config.get_secret_key() -> str` (generates + persists to `data/secret.key` on first call; honors `SECRET_KEY` env override)
  - `app.config.reset_config_cache() -> None` (clears memoized values; for tests)
  - `app.crypto.encrypt(plaintext: str) -> str` / `app.crypto.decrypt(token: str) -> str` (Fernet, key derived from the app secret)
  - `app.main.app` (FastAPI instance) with `GET /api/health -> {"status": "ok"}`

- [ ] **Step 1: Create `backend/pyproject.toml`**

```toml
[project]
name = "minimalpoi-backend"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.30",
    "sqlmodel>=0.0.22",
    "pyjwt>=2.9",
    "bcrypt>=4.2",
    "cryptography>=43",
    "python-multipart>=0.0.9",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3",
    "httpx>=0.27",
]

[tool.pytest.ini_options]
pythonpath = ["."]
testpaths = ["tests"]
```

- [ ] **Step 2: Create empty `backend/app/__init__.py` and `backend/tests/__init__.py`**

Both files are empty.

- [ ] **Step 3: Write `backend/tests/conftest.py`**

This isolates each test in its own temp `data/` directory so secrets/DB never leak between tests or into the repo.

```python
import importlib
import pytest


@pytest.fixture
def data_dir(tmp_path, monkeypatch):
    """Point the app at an isolated temp data dir and reset cached config."""
    d = tmp_path / "data"
    d.mkdir()
    monkeypatch.setenv("MINIMALPOI_DATA_DIR", str(d))
    monkeypatch.delenv("SECRET_KEY", raising=False)
    from app import config
    config.reset_config_cache()
    yield d
    config.reset_config_cache()
```

- [ ] **Step 4: Write the failing test `backend/tests/test_config.py`**

```python
from app import config, crypto


def test_secret_key_is_generated_and_persisted(data_dir):
    key1 = config.get_secret_key()
    assert key1
    assert (data_dir / "secret.key").exists()
    config.reset_config_cache()
    key2 = config.get_secret_key()
    assert key1 == key2  # persisted, stable across restarts


def test_secret_key_env_override(data_dir, monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "override-secret")
    config.reset_config_cache()
    assert config.get_secret_key() == "override-secret"


def test_crypto_round_trip(data_dir):
    token = crypto.encrypt("hunter2")
    assert token != "hunter2"
    assert crypto.decrypt(token) == "hunter2"
```

- [ ] **Step 5: Run test to verify it fails**

Run: `python -m pytest tests/test_config.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.config'` (and `app.crypto`).

- [ ] **Step 6: Implement `backend/app/config.py`**

```python
import os
import secrets
from functools import lru_cache
from pathlib import Path


def get_data_dir() -> Path:
    d = Path(os.environ.get("MINIMALPOI_DATA_DIR", "data"))
    d.mkdir(parents=True, exist_ok=True)
    return d


@lru_cache(maxsize=1)
def get_secret_key() -> str:
    env = os.environ.get("SECRET_KEY")
    if env:
        return env
    path = get_data_dir() / "secret.key"
    if path.exists():
        return path.read_text(encoding="utf-8").strip()
    key = secrets.token_urlsafe(48)
    path.write_text(key, encoding="utf-8")
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass  # best-effort on platforms without POSIX perms
    return key


def reset_config_cache() -> None:
    get_secret_key.cache_clear()
```

- [ ] **Step 7: Implement `backend/app/crypto.py`**

```python
import base64
import hashlib

from cryptography.fernet import Fernet

from .config import get_secret_key


def _fernet() -> Fernet:
    # Derive a stable 32-byte Fernet key from the app secret.
    digest = hashlib.sha256(get_secret_key().encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt(token: str) -> str:
    return _fernet().decrypt(token.encode("utf-8")).decode("utf-8")
```

- [ ] **Step 8: Implement `backend/app/main.py`**

```python
from fastapi import FastAPI

app = FastAPI(title="MinimalPOI")


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `python -m pytest tests/test_config.py -v`
Expected: PASS (3 passed).

- [ ] **Step 10: Commit**

```bash
git add backend/pyproject.toml backend/app backend/tests
git commit -m "feat(backend): scaffold app, config, secret bootstrap, crypto"
```

---

### Task 2: Database engine, session, and the User model

**Files:**
- Create: `backend/app/db.py`
- Create: `backend/app/models.py`
- Modify: `backend/app/main.py` (call `init_db()` on startup)
- Test: `backend/tests/test_db.py`

**Interfaces:**
- Consumes: `app.config.get_data_dir`
- Produces:
  - `app.db.engine` (SQLModel engine bound to `data/minimalpoi.db`)
  - `app.db.init_db() -> None` (creates all tables)
  - `app.db.get_session()` (FastAPI dependency yielding a `Session`)
  - `app.models.Role` enum (`ADMIN="admin"`, `MEMBER="member"`)
  - `app.models.User` table: `id, username (unique), password_hash, role, preferred_team_id (nullable), disabled (bool), created_at`

- [ ] **Step 1: Write the failing test `backend/tests/test_db.py`**

```python
from sqlmodel import Session, select

from app import db
from app.models import Role, User


def test_init_db_creates_tables_and_user_roundtrip(data_dir):
    db.reset_engine()
    db.init_db()
    with Session(db.engine) as session:
        session.add(User(username="alice", password_hash="x", role=Role.ADMIN))
        session.commit()
    with Session(db.engine) as session:
        user = session.exec(select(User).where(User.username == "alice")).one()
        assert user.id is not None
        assert user.role == Role.ADMIN
        assert user.disabled is False
        assert user.created_at is not None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_db.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.db'`.

- [ ] **Step 3: Implement `backend/app/models.py` (User + Role for now)**

```python
from datetime import datetime, timezone
from enum import Enum

from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Role(str, Enum):
    ADMIN = "admin"
    MEMBER = "member"


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    password_hash: str
    role: Role = Field(default=Role.MEMBER)
    preferred_team_id: int | None = Field(default=None, foreign_key="team.id")
    disabled: bool = Field(default=False)
    created_at: datetime = Field(default_factory=utcnow)
```

> Note: `preferred_team_id` references the `team` table created in Task 5. SQLite does not enforce the FK by default, so this is safe to declare now.

- [ ] **Step 4: Implement `backend/app/db.py`**

```python
from collections.abc import Iterator

from sqlmodel import Session, SQLModel, create_engine

from .config import get_data_dir

engine = None


def reset_engine() -> None:
    """(Re)build the engine against the current data dir. Used by tests."""
    global engine
    db_path = get_data_dir() / "minimalpoi.db"
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )


def init_db() -> None:
    if engine is None:
        reset_engine()
    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
```

- [ ] **Step 5: Wire startup in `backend/app/main.py`**

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI

from . import db


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    yield


app = FastAPI(title="MinimalPOI", lifespan=lifespan)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `python -m pytest tests/test_db.py -v`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/app/db.py backend/app/models.py backend/app/main.py backend/tests/test_db.py
git commit -m "feat(backend): db engine/session + User model"
```

---

### Task 3: Security — password hashing and JWT

**Files:**
- Create: `backend/app/security.py`
- Test: `backend/tests/test_security.py`

**Interfaces:**
- Consumes: `app.config.get_secret_key`
- Produces:
  - `app.security.hash_password(password: str) -> str`
  - `app.security.verify_password(password: str, password_hash: str) -> bool`
  - `app.security.create_access_token(username: str, expires_minutes: int = 10080) -> str`
  - `app.security.decode_access_token(token: str) -> str | None` (returns username, or `None` if invalid/expired)

- [ ] **Step 1: Write the failing test `backend/tests/test_security.py`**

```python
from app import security


def test_password_hash_and_verify(data_dir):
    h = security.hash_password("hunter2")
    assert h != "hunter2"
    assert security.verify_password("hunter2", h) is True
    assert security.verify_password("wrong", h) is False


def test_jwt_round_trip(data_dir):
    token = security.create_access_token("alice")
    assert security.decode_access_token(token) == "alice"


def test_jwt_rejects_garbage(data_dir):
    assert security.decode_access_token("not-a-token") is None


def test_jwt_rejects_expired(data_dir):
    token = security.create_access_token("alice", expires_minutes=-1)
    assert security.decode_access_token(token) is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_security.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.security'`.

- [ ] **Step 3: Implement `backend/app/security.py`**

```python
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from .config import get_secret_key

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(username: str, expires_minutes: int = 10080) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    payload = {"sub": username, "exp": expire}
    return jwt.encode(payload, get_secret_key(), algorithm=ALGORITHM)


def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, get_secret_key(), algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
    return payload.get("sub")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/test_security.py -v`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add backend/app/security.py backend/tests/test_security.py
git commit -m "feat(backend): password hashing + JWT helpers"
```

---

### Task 4: Auth dependencies and the app test client

**Files:**
- Create: `backend/app/deps.py`
- Modify: `backend/tests/conftest.py` (add `client` fixture)
- Test: covered indirectly; no standalone test file (validated in Task 5).

**Interfaces:**
- Consumes: `app.db.get_session`, `app.security.decode_access_token`, `app.models.User`, `app.models.Role`
- Produces:
  - `app.deps.SessionDep` (`Annotated[Session, Depends(get_session)]`)
  - `app.deps.get_current_user(...) -> User` (reads the `access_token` cookie; 401 if missing/invalid/disabled)
  - `app.deps.CurrentUser` (`Annotated[User, Depends(get_current_user)]`)
  - `app.deps.require_admin(...) -> User` (403 if not admin)
  - `app.deps.AdminUser` (`Annotated[User, Depends(require_admin)]`)
- `conftest.py` produces a `client` fixture (Starlette `TestClient`) bound to the temp DB.

- [ ] **Step 1: Implement `backend/app/deps.py`**

```python
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from sqlmodel import Session, select

from .db import get_session
from .models import Role, User

SessionDep = Annotated[Session, Depends(get_session)]


def get_current_user(
    session: SessionDep,
    access_token: Annotated[str | None, Cookie()] = None,
) -> User:
    from .security import decode_access_token

    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
    )
    if not access_token:
        raise credentials_error
    username = decode_access_token(access_token)
    if not username:
        raise credentials_error
    user = session.exec(select(User).where(User.username == username)).first()
    if not user or user.disabled:
        raise credentials_error
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_admin(user: CurrentUser) -> User:
    if user.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return user


AdminUser = Annotated[User, Depends(require_admin)]
```

- [ ] **Step 2: Add the `client` fixture to `backend/tests/conftest.py`**

Append this fixture (keep the existing `data_dir` fixture above it):

```python
@pytest.fixture
def client(data_dir):
    from app import db
    db.reset_engine()
    db.init_db()
    from app.main import app
    from starlette.testclient import TestClient
    with TestClient(app) as c:
        yield c
```

- [ ] **Step 3: Sanity-check the client fixture against health**

Add `backend/tests/test_health.py`:

```python
def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_health.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/deps.py backend/tests/conftest.py backend/tests/test_health.py
git commit -m "feat(backend): auth dependencies + test client fixture"
```

---

### Task 5: First-run setup, login, logout, and `me`

**Files:**
- Create: `backend/app/schemas.py`
- Create: `backend/app/routers/__init__.py` (empty)
- Create: `backend/app/routers/auth.py`
- Modify: `backend/app/main.py` (register the auth router)
- Test: `backend/tests/test_auth.py`

**Interfaces:**
- Consumes: `SessionDep`, `CurrentUser`, `security.hash_password/verify_password/create_access_token`, `models.User/Role`
- Produces:
  - `app.schemas.SetupStatus { needs_setup: bool }`
  - `app.schemas.Credentials { username: str, password: str }`
  - `app.schemas.UserRead { id, username, role, preferred_team_id, disabled, created_at }`
  - Endpoints:
    - `GET /api/auth/setup-status -> SetupStatus`
    - `POST /api/auth/setup` (creates first admin; 409 if any user exists) → sets cookie, returns `UserRead`
    - `POST /api/auth/login` → sets `access_token` httpOnly cookie, returns `UserRead`; 401 on bad creds or disabled
    - `POST /api/auth/logout` → clears cookie
    - `GET /api/auth/me -> UserRead`

- [ ] **Step 1: Write the failing test `backend/tests/test_auth.py`**

```python
def test_setup_flow_and_auth(client):
    # Fresh instance needs setup.
    assert client.get("/api/auth/setup-status").json() == {"needs_setup": True}

    # Create first admin.
    resp = client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["username"] == "admin"
    assert body["role"] == "admin"

    # Setup is now closed.
    assert client.get("/api/auth/setup-status").json() == {"needs_setup": False}
    assert client.post("/api/auth/setup", json={"username": "x", "password": "y"}).status_code == 409

    # me works because setup set the cookie.
    assert client.get("/api/auth/me").json()["username"] == "admin"

    # logout clears the cookie.
    client.post("/api/auth/logout")
    assert client.get("/api/auth/me").status_code == 401

    # login again.
    assert client.post("/api/auth/login", json={"username": "admin", "password": "pw"}).status_code == 200
    assert client.get("/api/auth/me").json()["role"] == "admin"


def test_login_rejects_bad_password(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})
    client.post("/api/auth/logout")
    assert client.post("/api/auth/login", json={"username": "admin", "password": "nope"}).status_code == 401
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_auth.py -v`
Expected: FAIL — 404 on `/api/auth/setup-status` (router not registered).

- [ ] **Step 3: Implement `backend/app/schemas.py` (auth schemas)**

```python
from datetime import datetime

from sqlmodel import SQLModel

from .models import Role


class SetupStatus(SQLModel):
    needs_setup: bool


class Credentials(SQLModel):
    username: str
    password: str


class UserRead(SQLModel):
    id: int
    username: str
    role: Role
    preferred_team_id: int | None
    disabled: bool
    created_at: datetime
```

- [ ] **Step 4: Implement `backend/app/routers/auth.py`**

```python
from fastapi import APIRouter, HTTPException, Response, status
from sqlmodel import select

from ..deps import CurrentUser, SessionDep
from ..models import Role, User
from ..schemas import Credentials, SetupStatus, UserRead
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_NAME = "access_token"


def _set_auth_cookie(response: Response, username: str) -> None:
    response.set_cookie(
        COOKIE_NAME,
        create_access_token(username),
        httponly=True,
        samesite="lax",
        path="/",
    )


def _any_user_exists(session: SessionDep) -> bool:
    return session.exec(select(User)).first() is not None


@router.get("/setup-status", response_model=SetupStatus)
def setup_status(session: SessionDep) -> SetupStatus:
    return SetupStatus(needs_setup=not _any_user_exists(session))


@router.post("/setup", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def setup(creds: Credentials, session: SessionDep, response: Response) -> User:
    if _any_user_exists(session):
        raise HTTPException(status_code=409, detail="Setup already completed")
    user = User(
        username=creds.username,
        password_hash=hash_password(creds.password),
        role=Role.ADMIN,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    _set_auth_cookie(response, user.username)
    return user


@router.post("/login", response_model=UserRead)
def login(creds: Credentials, session: SessionDep, response: Response) -> User:
    user = session.exec(select(User).where(User.username == creds.username)).first()
    if not user or user.disabled or not verify_password(creds.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    _set_auth_cookie(response, user.username)
    return user


@router.post("/logout")
def logout(response: Response) -> dict:
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"status": "ok"}


@router.get("/me", response_model=UserRead)
def me(user: CurrentUser) -> User:
    return user
```

- [ ] **Step 5: Register the router in `backend/app/main.py`**

Add the import and `include_router` call:

```python
from .routers import auth

app.include_router(auth.router)
```

(Place `app.include_router(auth.router)` after the `app = FastAPI(...)` line.)

- [ ] **Step 6: Run tests to verify they pass**

Run: `python -m pytest tests/test_auth.py -v`
Expected: PASS (2 passed).

- [ ] **Step 7: Commit**

```bash
git add backend/app/schemas.py backend/app/routers backend/app/main.py backend/tests/test_auth.py
git commit -m "feat(backend): first-run setup, login/logout, me"
```

---

### Task 6: Admin user management

**Files:**
- Modify: `backend/app/schemas.py` (add `UserCreate`, `UserUpdate`)
- Create: `backend/app/routers/users.py`
- Modify: `backend/app/main.py` (register router)
- Test: `backend/tests/test_users.py`

**Interfaces:**
- Consumes: `AdminUser`, `SessionDep`, `models.User/Role`, `security.hash_password`
- Produces:
  - `app.schemas.UserCreate { username, password, role=member }`
  - `app.schemas.UserUpdate { password?, role?, disabled? }`
  - Endpoints (all admin-only):
    - `GET /api/users -> list[UserRead]`
    - `POST /api/users -> UserRead` (409 on duplicate username)
    - `PATCH /api/users/{id} -> UserRead` (404 if missing)
    - `DELETE /api/users/{id}` (204; 400 if deleting the last admin)

- [ ] **Step 1: Write the failing test `backend/tests/test_users.py`**

```python
def _setup_admin(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})


def test_admin_can_manage_users(client):
    _setup_admin(client)

    created = client.post("/api/users", json={"username": "bob", "password": "pw"})
    assert created.status_code == 201
    bob_id = created.json()["id"]
    assert created.json()["role"] == "member"

    # duplicate username rejected
    assert client.post("/api/users", json={"username": "bob", "password": "pw"}).status_code == 409

    # list shows both
    assert len(client.get("/api/users").json()) == 2

    # disable bob, then bob cannot log in
    assert client.patch(f"/api/users/{bob_id}", json={"disabled": True}).status_code == 200
    client.post("/api/auth/logout")
    assert client.post("/api/auth/login", json={"username": "bob", "password": "pw"}).status_code == 401


def test_non_admin_forbidden(client):
    _setup_admin(client)
    client.post("/api/users", json={"username": "bob", "password": "pw"})
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw"})
    assert client.get("/api/users").status_code == 403


def test_cannot_delete_last_admin(client):
    _setup_admin(client)
    admin_id = client.get("/api/auth/me").json()["id"]
    assert client.delete(f"/api/users/{admin_id}").status_code == 400
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_users.py -v`
Expected: FAIL — 404 on `/api/users`.

- [ ] **Step 3: Add schemas to `backend/app/schemas.py`**

```python
class UserCreate(SQLModel):
    username: str
    password: str
    role: Role = Role.MEMBER


class UserUpdate(SQLModel):
    password: str | None = None
    role: Role | None = None
    disabled: bool | None = None
```

- [ ] **Step 4: Implement `backend/app/routers/users.py`**

```python
from fastapi import APIRouter, HTTPException, Response, status
from sqlmodel import select

from ..deps import AdminUser, SessionDep
from ..models import Role, User
from ..schemas import UserCreate, UserRead, UserUpdate
from ..security import hash_password

router = APIRouter(prefix="/api/users", tags=["users"])


def _admin_count(session: SessionDep) -> int:
    return len(session.exec(select(User).where(User.role == Role.ADMIN)).all())


@router.get("", response_model=list[UserRead])
def list_users(session: SessionDep, _: AdminUser) -> list[User]:
    return session.exec(select(User)).all()


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(body: UserCreate, session: SessionDep, _: AdminUser) -> User:
    if session.exec(select(User).where(User.username == body.username)).first():
        raise HTTPException(status_code=409, detail="Username taken")
    user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        role=body.role,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserRead)
def update_user(user_id: int, body: UserUpdate, session: SessionDep, _: AdminUser) -> User:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Not found")
    if body.password is not None:
        user.password_hash = hash_password(body.password)
    if body.role is not None:
        user.role = body.role
    if body.disabled is not None:
        user.disabled = body.disabled
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, session: SessionDep, _: AdminUser) -> Response:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Not found")
    if user.role == Role.ADMIN and _admin_count(session) <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the last admin")
    session.delete(user)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
```

- [ ] **Step 5: Register the router in `backend/app/main.py`**

```python
from .routers import auth, users

app.include_router(users.router)
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `python -m pytest tests/test_users.py -v`
Expected: PASS (3 passed).

- [ ] **Step 7: Commit**

```bash
git add backend/app/schemas.py backend/app/routers/users.py backend/app/main.py backend/tests/test_users.py
git commit -m "feat(backend): admin user management"
```

---

### Task 7: Teams

**Files:**
- Modify: `backend/app/models.py` (add `Team`, `TeamMember`)
- Modify: `backend/app/schemas.py` (add `TeamCreate`, `TeamRead`)
- Create: `backend/app/routers/teams.py`
- Modify: `backend/app/main.py` (register router)
- Test: `backend/tests/test_teams.py`

**Interfaces:**
- Consumes: `CurrentUser`, `SessionDep`, `models.User`
- Produces:
  - `app.models.Team { id, name, created_by, created_at }`
  - `app.models.TeamMember { team_id (pk), user_id (pk) }`
  - `app.schemas.TeamCreate { name, member_ids: list[int] = [] }`
  - `app.schemas.TeamRead { id, name, created_by, member_ids: list[int] }`
  - Endpoints (any authenticated user):
    - `GET /api/teams -> list[TeamRead]`
    - `POST /api/teams -> TeamRead`
    - `PATCH /api/teams/{id} -> TeamRead` (rename / replace members)
    - `DELETE /api/teams/{id}` (204)

- [ ] **Step 1: Write the failing test `backend/tests/test_teams.py`**

```python
def _setup_with_member(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})
    bob = client.post("/api/users", json={"username": "bob", "password": "pw"}).json()
    return bob["id"]


def test_team_crud(client):
    bob_id = _setup_with_member(client)
    me_id = client.get("/api/auth/me").json()["id"]

    created = client.post("/api/teams", json={"name": "family", "member_ids": [me_id, bob_id]})
    assert created.status_code == 201
    team = created.json()
    assert team["name"] == "family"
    assert set(team["member_ids"]) == {me_id, bob_id}

    # rename + drop bob
    updated = client.patch(f"/api/teams/{team['id']}", json={"name": "fam", "member_ids": [me_id]})
    assert updated.json()["name"] == "fam"
    assert updated.json()["member_ids"] == [me_id]

    assert len(client.get("/api/teams").json()) == 1
    assert client.delete(f"/api/teams/{team['id']}").status_code == 204
    assert client.get("/api/teams").json() == []
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_teams.py -v`
Expected: FAIL — 404 on `/api/teams`.

- [ ] **Step 3: Add models to `backend/app/models.py`**

```python
class Team(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    created_by: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=utcnow)


class TeamMember(SQLModel, table=True):
    team_id: int = Field(foreign_key="team.id", primary_key=True)
    user_id: int = Field(foreign_key="user.id", primary_key=True)
```

- [ ] **Step 4: Add schemas to `backend/app/schemas.py`**

```python
class TeamCreate(SQLModel):
    name: str
    member_ids: list[int] = []


class TeamRead(SQLModel):
    id: int
    name: str
    created_by: int
    member_ids: list[int] = []
```

- [ ] **Step 5: Implement `backend/app/routers/teams.py`**

```python
from fastapi import APIRouter, HTTPException, Response, status
from sqlmodel import select

from ..deps import CurrentUser, SessionDep
from ..models import Team, TeamMember
from ..schemas import TeamCreate, TeamRead

router = APIRouter(prefix="/api/teams", tags=["teams"])


def _member_ids(session: SessionDep, team_id: int) -> list[int]:
    rows = session.exec(select(TeamMember).where(TeamMember.team_id == team_id)).all()
    return [r.user_id for r in rows]


def _to_read(session: SessionDep, team: Team) -> TeamRead:
    return TeamRead(
        id=team.id,
        name=team.name,
        created_by=team.created_by,
        member_ids=_member_ids(session, team.id),
    )


def _set_members(session: SessionDep, team_id: int, member_ids: list[int]) -> None:
    for row in session.exec(select(TeamMember).where(TeamMember.team_id == team_id)).all():
        session.delete(row)
    for uid in set(member_ids):
        session.add(TeamMember(team_id=team_id, user_id=uid))


@router.get("", response_model=list[TeamRead])
def list_teams(session: SessionDep, _: CurrentUser) -> list[TeamRead]:
    teams = session.exec(select(Team)).all()
    return [_to_read(session, t) for t in teams]


@router.post("", response_model=TeamRead, status_code=status.HTTP_201_CREATED)
def create_team(body: TeamCreate, session: SessionDep, user: CurrentUser) -> TeamRead:
    team = Team(name=body.name, created_by=user.id)
    session.add(team)
    session.commit()
    session.refresh(team)
    _set_members(session, team.id, body.member_ids)
    session.commit()
    return _to_read(session, team)


@router.patch("/{team_id}", response_model=TeamRead)
def update_team(team_id: int, body: TeamCreate, session: SessionDep, _: CurrentUser) -> TeamRead:
    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Not found")
    team.name = body.name
    session.add(team)
    _set_members(session, team_id, body.member_ids)
    session.commit()
    session.refresh(team)
    return _to_read(session, team)


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team(team_id: int, session: SessionDep, _: CurrentUser) -> Response:
    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Not found")
    for row in session.exec(select(TeamMember).where(TeamMember.team_id == team_id)).all():
        session.delete(row)
    session.delete(team)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
```

- [ ] **Step 6: Register the router in `backend/app/main.py`**

```python
from .routers import auth, categories, comments, pois, settings, teams, users, visits, wishlist

app.include_router(teams.router)
```

> Register only the routers that exist so far; add the rest as their tasks land. For now add `app.include_router(teams.router)`.

- [ ] **Step 7: Run tests to verify they pass**

Run: `python -m pytest tests/test_teams.py -v`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/app/models.py backend/app/schemas.py backend/app/routers/teams.py backend/app/main.py backend/tests/test_teams.py
git commit -m "feat(backend): teams CRUD"
```

---

### Task 8: Categories

**Files:**
- Modify: `backend/app/models.py` (add `Category`)
- Modify: `backend/app/schemas.py` (add `CategoryCreate`, `CategoryUpdate`, `CategoryRead`)
- Create: `backend/app/routers/categories.py`
- Modify: `backend/app/main.py` (register router)
- Test: `backend/tests/test_categories.py`

**Interfaces:**
- Consumes: `CurrentUser`, `SessionDep`
- Produces:
  - `app.models.Category { id, name, color, trip_category_name (nullable), created_by, created_at }`
  - `app.schemas.CategoryCreate { name, color="#4f46e5", trip_category_name? }`
  - `app.schemas.CategoryUpdate { name?, color?, trip_category_name? }`
  - `app.schemas.CategoryRead { id, name, color, trip_category_name, created_by }`
  - Endpoints (authenticated): `GET/POST /api/categories`, `PATCH/DELETE /api/categories/{id}`

- [ ] **Step 1: Write the failing test `backend/tests/test_categories.py`**

```python
def _setup_admin(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})


def test_category_crud(client):
    _setup_admin(client)
    created = client.post(
        "/api/categories",
        json={"name": "Food", "color": "#2F9E63", "trip_category_name": "Restaurants"},
    )
    assert created.status_code == 201
    cat = created.json()
    assert cat["name"] == "Food"
    assert cat["trip_category_name"] == "Restaurants"

    updated = client.patch(f"/api/categories/{cat['id']}", json={"color": "#E0A22A"})
    assert updated.json()["color"] == "#E0A22A"

    assert len(client.get("/api/categories").json()) == 1
    assert client.delete(f"/api/categories/{cat['id']}").status_code == 204
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_categories.py -v`
Expected: FAIL — 404 on `/api/categories`.

- [ ] **Step 3: Add the model to `backend/app/models.py`**

```python
class Category(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    color: str = Field(default="#4f46e5")
    trip_category_name: str | None = Field(default=None)
    created_by: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=utcnow)
```

- [ ] **Step 4: Add schemas to `backend/app/schemas.py`**

```python
class CategoryCreate(SQLModel):
    name: str
    color: str = "#4f46e5"
    trip_category_name: str | None = None


class CategoryUpdate(SQLModel):
    name: str | None = None
    color: str | None = None
    trip_category_name: str | None = None


class CategoryRead(SQLModel):
    id: int
    name: str
    color: str
    trip_category_name: str | None
    created_by: int
```

- [ ] **Step 5: Implement `backend/app/routers/categories.py`**

```python
from fastapi import APIRouter, HTTPException, Response, status
from sqlmodel import select

from ..deps import CurrentUser, SessionDep
from ..models import Category
from ..schemas import CategoryCreate, CategoryRead, CategoryUpdate

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[CategoryRead])
def list_categories(session: SessionDep, _: CurrentUser) -> list[Category]:
    return session.exec(select(Category)).all()


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(body: CategoryCreate, session: SessionDep, user: CurrentUser) -> Category:
    cat = Category(
        name=body.name,
        color=body.color,
        trip_category_name=body.trip_category_name,
        created_by=user.id,
    )
    session.add(cat)
    session.commit()
    session.refresh(cat)
    return cat


@router.patch("/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: int, body: CategoryUpdate, session: SessionDep, _: CurrentUser
) -> Category:
    cat = session.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Not found")
    data = body.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(cat, key, value)
    session.add(cat)
    session.commit()
    session.refresh(cat)
    return cat


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, session: SessionDep, _: CurrentUser) -> Response:
    cat = session.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Not found")
    session.delete(cat)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
```

- [ ] **Step 6: Register the router in `backend/app/main.py`**

```python
app.include_router(categories.router)
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `python -m pytest tests/test_categories.py -v`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/app/models.py backend/app/schemas.py backend/app/routers/categories.py backend/app/main.py backend/tests/test_categories.py
git commit -m "feat(backend): categories CRUD"
```

---

### Task 9: POIs with duplicate detection

**Files:**
- Modify: `backend/app/models.py` (add `SyncStatus` enum, `POI`, `Tombstone`)
- Modify: `backend/app/schemas.py` (add `POICreate`, `POIUpdate`, `POIRead`, `DuplicateCheck`, `DuplicateResult`)
- Create: `backend/app/dedup.py` (haversine + duplicate finder)
- Create: `backend/app/routers/pois.py`
- Modify: `backend/app/main.py` (register router)
- Test: `backend/tests/test_pois.py`

**Interfaces:**
- Consumes: `CurrentUser`, `SessionDep`, `models.Category`
- Produces:
  - `app.models.SyncStatus` enum (`LOCAL_ONLY="local_only"`, `PENDING="pending"`, `SYNCED="synced"`, `CONFLICT="conflict"`, `ERROR="error"`)
  - `app.models.POI` table: `id, name, address, lat, lng, category_id, tags (JSON list), notes, phone, email, website, image_url, source_url, created_by, created_at, updated_at, trip_place_id, trip_sync_status, trip_synced_snapshot (JSON), trip_synced_at, trip_last_error`
  - `app.models.Tombstone { id, trip_place_id, origin, created_at }`
  - `app.dedup.haversine_m(lat1, lng1, lat2, lng2) -> float`
  - `app.dedup.find_duplicate(session, name, lat, lng, source_url) -> POI | None`
  - `app.schemas.POICreate` / `POIUpdate` / `POIRead` / `DuplicateCheck { name, lat?, lng?, source_url? }` / `DuplicateResult { duplicate_id: int | None }`
  - Endpoints (authenticated): `GET/POST /api/pois`, `GET/PATCH/DELETE /api/pois/{id}`, `POST /api/pois/check-duplicate -> DuplicateResult`

- [ ] **Step 1: Write the failing test `backend/tests/test_pois.py`**

```python
from app.dedup import haversine_m


def _setup(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})
    return client.post("/api/categories", json={"name": "Food"}).json()["id"]


def test_haversine_known_distance():
    # Amsterdam Dam square to Amsterdam Centraal ~ 800m.
    d = haversine_m(52.3731, 4.8922, 52.3791, 4.9003)
    assert 600 < d < 1100


def test_poi_crud(client):
    cat_id = _setup(client)
    created = client.post(
        "/api/pois",
        json={"name": "Café Modern", "address": "Amsterdam", "lat": 52.3, "lng": 4.9,
              "category_id": cat_id, "tags": ["popular"]},
    )
    assert created.status_code == 201
    poi = created.json()
    assert poi["name"] == "Café Modern"
    assert poi["tags"] == ["popular"]
    assert poi["trip_sync_status"] == "local_only"

    updated = client.patch(f"/api/pois/{poi['id']}", json={"notes": "great coffee"})
    assert updated.json()["notes"] == "great coffee"

    assert len(client.get("/api/pois").json()) == 1
    assert client.delete(f"/api/pois/{poi['id']}").status_code == 204
    assert client.get("/api/pois").json() == []


def test_duplicate_detection_by_proximity_and_url(client):
    cat_id = _setup(client)
    client.post(
        "/api/pois",
        json={"name": "Café Modern", "address": "A'dam", "lat": 52.3676, "lng": 4.9041,
              "category_id": cat_id, "source_url": "https://maps.example/cafe"},
    )
    # same name, ~tens of meters away -> duplicate
    near = client.post("/api/pois/check-duplicate",
                       json={"name": "Cafe Modern", "lat": 52.3677, "lng": 4.9042})
    assert near.json()["duplicate_id"] is not None
    # same source url -> duplicate
    by_url = client.post("/api/pois/check-duplicate",
                         json={"name": "Whatever", "source_url": "https://maps.example/cafe"})
    assert by_url.json()["duplicate_id"] is not None
    # far away, different name -> not a duplicate
    far = client.post("/api/pois/check-duplicate",
                      json={"name": "Other Place", "lat": 48.0, "lng": 2.0})
    assert far.json()["duplicate_id"] is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_pois.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.dedup'`.

- [ ] **Step 3: Add enums and models to `backend/app/models.py`**

Add `Column`, `JSON` import at the top of the file:

```python
from sqlalchemy import JSON, Column
```

Then add:

```python
class SyncStatus(str, Enum):
    LOCAL_ONLY = "local_only"
    PENDING = "pending"
    SYNCED = "synced"
    CONFLICT = "conflict"
    ERROR = "error"


class POI(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    address: str | None = Field(default=None)
    lat: float
    lng: float
    category_id: int | None = Field(default=None, foreign_key="category.id")
    tags: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    notes: str | None = Field(default=None)
    phone: str | None = Field(default=None)
    email: str | None = Field(default=None)
    website: str | None = Field(default=None)
    image_url: str | None = Field(default=None)
    source_url: str | None = Field(default=None)
    created_by: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    trip_place_id: int | None = Field(default=None)
    trip_sync_status: SyncStatus = Field(default=SyncStatus.LOCAL_ONLY)
    trip_synced_snapshot: dict | None = Field(default=None, sa_column=Column(JSON))
    trip_synced_at: datetime | None = Field(default=None)
    trip_last_error: str | None = Field(default=None)


class Tombstone(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    trip_place_id: int
    origin: str  # "local" | "trip"
    created_at: datetime = Field(default_factory=utcnow)
```

- [ ] **Step 4: Add schemas to `backend/app/schemas.py`**

```python
class POICreate(SQLModel):
    name: str
    address: str | None = None
    lat: float
    lng: float
    category_id: int | None = None
    tags: list[str] = []
    notes: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    image_url: str | None = None
    source_url: str | None = None


class POIUpdate(SQLModel):
    name: str | None = None
    address: str | None = None
    lat: float | None = None
    lng: float | None = None
    category_id: int | None = None
    tags: list[str] | None = None
    notes: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    image_url: str | None = None
    source_url: str | None = None


class POIRead(SQLModel):
    id: int
    name: str
    address: str | None
    lat: float
    lng: float
    category_id: int | None
    tags: list[str]
    notes: str | None
    phone: str | None
    email: str | None
    website: str | None
    image_url: str | None
    source_url: str | None
    created_by: int
    created_at: datetime
    updated_at: datetime
    trip_place_id: int | None
    trip_sync_status: SyncStatus


class DuplicateCheck(SQLModel):
    name: str
    lat: float | None = None
    lng: float | None = None
    source_url: str | None = None


class DuplicateResult(SQLModel):
    duplicate_id: int | None
```

Add `SyncStatus` to the existing `from .models import ...` line in `schemas.py`.

- [ ] **Step 5: Implement `backend/app/dedup.py`**

```python
import math

from sqlmodel import Session, select

from .models import POI

PROXIMITY_THRESHOLD_M = 150.0


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(a))


def _norm(name: str) -> str:
    return "".join(ch for ch in name.lower() if ch.isalnum())


def find_duplicate(
    session: Session,
    name: str,
    lat: float | None,
    lng: float | None,
    source_url: str | None,
) -> POI | None:
    candidates = session.exec(select(POI)).all()
    if source_url:
        for poi in candidates:
            if poi.source_url and poi.source_url == source_url:
                return poi
    if lat is not None and lng is not None:
        target = _norm(name)
        for poi in candidates:
            if _norm(poi.name) == target and haversine_m(lat, lng, poi.lat, poi.lng) <= PROXIMITY_THRESHOLD_M:
                return poi
    return None
```

- [ ] **Step 6: Implement `backend/app/routers/pois.py`**

```python
from fastapi import APIRouter, HTTPException, Response, status
from sqlmodel import select

from ..dedup import find_duplicate
from ..deps import CurrentUser, SessionDep
from ..models import POI, Tombstone, utcnow
from ..schemas import DuplicateCheck, DuplicateResult, POICreate, POIRead, POIUpdate

router = APIRouter(prefix="/api/pois", tags=["pois"])


@router.get("", response_model=list[POIRead])
def list_pois(session: SessionDep, _: CurrentUser) -> list[POI]:
    return session.exec(select(POI)).all()


@router.post("", response_model=POIRead, status_code=status.HTTP_201_CREATED)
def create_poi(body: POICreate, session: SessionDep, user: CurrentUser) -> POI:
    poi = POI(**body.model_dump(), created_by=user.id)
    session.add(poi)
    session.commit()
    session.refresh(poi)
    return poi


@router.post("/check-duplicate", response_model=DuplicateResult)
def check_duplicate(body: DuplicateCheck, session: SessionDep, _: CurrentUser) -> DuplicateResult:
    dup = find_duplicate(session, body.name, body.lat, body.lng, body.source_url)
    return DuplicateResult(duplicate_id=dup.id if dup else None)


@router.get("/{poi_id}", response_model=POIRead)
def get_poi(poi_id: int, session: SessionDep, _: CurrentUser) -> POI:
    poi = session.get(POI, poi_id)
    if not poi:
        raise HTTPException(status_code=404, detail="Not found")
    return poi


@router.patch("/{poi_id}", response_model=POIRead)
def update_poi(poi_id: int, body: POIUpdate, session: SessionDep, _: CurrentUser) -> POI:
    poi = session.get(POI, poi_id)
    if not poi:
        raise HTTPException(status_code=404, detail="Not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(poi, key, value)
    poi.updated_at = utcnow()
    session.add(poi)
    session.commit()
    session.refresh(poi)
    return poi


@router.delete("/{poi_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_poi(poi_id: int, session: SessionDep, _: CurrentUser) -> Response:
    poi = session.get(POI, poi_id)
    if not poi:
        raise HTTPException(status_code=404, detail="Not found")
    if poi.trip_place_id is not None:
        session.add(Tombstone(trip_place_id=poi.trip_place_id, origin="local"))
    session.delete(poi)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
```

- [ ] **Step 7: Register the router in `backend/app/main.py`**

```python
app.include_router(pois.router)
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `python -m pytest tests/test_pois.py -v`
Expected: PASS (3 passed).

- [ ] **Step 9: Commit**

```bash
git add backend/app/models.py backend/app/schemas.py backend/app/dedup.py backend/app/routers/pois.py backend/app/main.py backend/tests/test_pois.py
git commit -m "feat(backend): POI CRUD + duplicate detection + delete tombstones"
```

---

### Task 10: Per-user visits (with team + rating) and preferred team

**Files:**
- Modify: `backend/app/models.py` (add `Visit`)
- Modify: `backend/app/schemas.py` (add `VisitUpsert`, `VisitRead`, `PreferredTeamUpdate`)
- Create: `backend/app/routers/visits.py`
- Modify: `backend/app/routers/auth.py` (add `PATCH /api/auth/me/preferences`)
- Modify: `backend/app/main.py` (register router)
- Test: `backend/tests/test_visits.py`

**Interfaces:**
- Consumes: `CurrentUser`, `SessionDep`, `models.POI/User`
- Produces:
  - `app.models.Visit { id, poi_id, user_id, team_id (nullable=solo), rating (nullable 1–5), created_at }` with unique `(poi_id, user_id)`
  - `app.schemas.VisitUpsert { team_id?: int, rating?: int }`
  - `app.schemas.VisitRead { poi_id, user_id, team_id, rating }`
  - `app.schemas.PreferredTeamUpdate { preferred_team_id: int | None }`
  - Endpoints:
    - `PUT /api/pois/{poi_id}/visit -> VisitRead` (mark visited; defaults `team_id` to caller's `preferred_team_id` when omitted)
    - `DELETE /api/pois/{poi_id}/visit` (204; un-visit)
    - `GET /api/pois/{poi_id}/visits -> list[VisitRead]`
    - `PATCH /api/auth/me/preferences -> UserRead`

- [ ] **Step 1: Write the failing test `backend/tests/test_visits.py`**

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_visits.py -v`
Expected: FAIL — 404 on `/api/auth/me/preferences`.

- [ ] **Step 3: Add the model to `backend/app/models.py`**

Add `UniqueConstraint` import:

```python
from sqlalchemy import JSON, Column, UniqueConstraint
```

```python
class Visit(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("poi_id", "user_id", name="uq_visit_poi_user"),)
    id: int | None = Field(default=None, primary_key=True)
    poi_id: int = Field(foreign_key="poi.id")
    user_id: int = Field(foreign_key="user.id")
    team_id: int | None = Field(default=None, foreign_key="team.id")
    rating: int | None = Field(default=None)
    created_at: datetime = Field(default_factory=utcnow)
```

- [ ] **Step 4: Add schemas to `backend/app/schemas.py`**

```python
class VisitUpsert(SQLModel):
    team_id: int | None = None
    rating: int | None = None


class VisitRead(SQLModel):
    poi_id: int
    user_id: int
    team_id: int | None
    rating: int | None


class PreferredTeamUpdate(SQLModel):
    preferred_team_id: int | None = None
```

- [ ] **Step 5: Implement `backend/app/routers/visits.py`**

```python
from fastapi import APIRouter, HTTPException, Response, status
from sqlmodel import select

from ..deps import CurrentUser, SessionDep
from ..models import POI, Visit
from ..schemas import VisitRead, VisitUpsert

router = APIRouter(prefix="/api/pois", tags=["visits"])


def _existing(session: SessionDep, poi_id: int, user_id: int) -> Visit | None:
    return session.exec(
        select(Visit).where(Visit.poi_id == poi_id, Visit.user_id == user_id)
    ).first()


@router.put("/{poi_id}/visit", response_model=VisitRead)
def upsert_visit(poi_id: int, body: VisitUpsert, session: SessionDep, user: CurrentUser) -> Visit:
    if not session.get(POI, poi_id):
        raise HTTPException(status_code=404, detail="Not found")
    fields = body.model_dump(exclude_unset=True)
    visit = _existing(session, poi_id, user.id)
    if visit is None:
        visit = Visit(
            poi_id=poi_id,
            user_id=user.id,
            team_id=fields.get("team_id", user.preferred_team_id),
            rating=fields.get("rating"),
        )
    else:
        if "team_id" in fields:
            visit.team_id = fields["team_id"]
        if "rating" in fields:
            visit.rating = fields["rating"]
    session.add(visit)
    session.commit()
    session.refresh(visit)
    return visit


@router.get("/{poi_id}/visits", response_model=list[VisitRead])
def list_visits(poi_id: int, session: SessionDep, _: CurrentUser) -> list[Visit]:
    return session.exec(select(Visit).where(Visit.poi_id == poi_id)).all()


@router.delete("/{poi_id}/visit", status_code=status.HTTP_204_NO_CONTENT)
def delete_visit(poi_id: int, session: SessionDep, user: CurrentUser) -> Response:
    visit = _existing(session, poi_id, user.id)
    if visit:
        session.delete(visit)
        session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
```

> Note: when `team_id` is omitted entirely, the caller's `preferred_team_id` is used; passing `"team_id": null` explicitly sets solo (the test exercises both).

- [ ] **Step 6: Add the preferences endpoint to `backend/app/routers/auth.py`**

Add the import and endpoint:

```python
from ..schemas import Credentials, PreferredTeamUpdate, SetupStatus, UserRead


@router.patch("/me/preferences", response_model=UserRead)
def update_preferences(
    body: PreferredTeamUpdate, session: SessionDep, user: CurrentUser
) -> User:
    user.preferred_team_id = body.preferred_team_id
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
```

- [ ] **Step 7: Register the router in `backend/app/main.py`**

```python
app.include_router(visits.router)
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `python -m pytest tests/test_visits.py -v`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/app/models.py backend/app/schemas.py backend/app/routers/visits.py backend/app/routers/auth.py backend/app/main.py backend/tests/test_visits.py
git commit -m "feat(backend): per-user visits with team+rating and preferred team"
```

---

### Task 11: Wishlist (per-user "want to go")

**Files:**
- Modify: `backend/app/models.py` (add `Wishlist`)
- Modify: `backend/app/schemas.py` (add `WishlistRead`)
- Create: `backend/app/routers/wishlist.py`
- Modify: `backend/app/main.py` (register router)
- Test: `backend/tests/test_wishlist.py`

**Interfaces:**
- Consumes: `CurrentUser`, `SessionDep`, `models.POI`
- Produces:
  - `app.models.Wishlist { id, poi_id, user_id, created_at }` with unique `(poi_id, user_id)`
  - `app.schemas.WishlistRead { poi_id, user_id }`
  - Endpoints: `PUT /api/pois/{poi_id}/wishlist -> WishlistRead`, `DELETE /api/pois/{poi_id}/wishlist` (204), `GET /api/pois/{poi_id}/wishlist -> list[WishlistRead]`

- [ ] **Step 1: Write the failing test `backend/tests/test_wishlist.py`**

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_wishlist.py -v`
Expected: FAIL — 404 on the wishlist route.

- [ ] **Step 3: Add the model to `backend/app/models.py`**

```python
class Wishlist(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("poi_id", "user_id", name="uq_wishlist_poi_user"),)
    id: int | None = Field(default=None, primary_key=True)
    poi_id: int = Field(foreign_key="poi.id")
    user_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=utcnow)
```

- [ ] **Step 4: Add the schema to `backend/app/schemas.py`**

```python
class WishlistRead(SQLModel):
    poi_id: int
    user_id: int
```

- [ ] **Step 5: Implement `backend/app/routers/wishlist.py`**

```python
from fastapi import APIRouter, HTTPException, Response, status
from sqlmodel import select

from ..deps import CurrentUser, SessionDep
from ..models import POI, Wishlist
from ..schemas import WishlistRead

router = APIRouter(prefix="/api/pois", tags=["wishlist"])


def _existing(session: SessionDep, poi_id: int, user_id: int) -> Wishlist | None:
    return session.exec(
        select(Wishlist).where(Wishlist.poi_id == poi_id, Wishlist.user_id == user_id)
    ).first()


@router.put("/{poi_id}/wishlist", response_model=WishlistRead)
def add_wishlist(poi_id: int, session: SessionDep, user: CurrentUser) -> Wishlist:
    if not session.get(POI, poi_id):
        raise HTTPException(status_code=404, detail="Not found")
    item = _existing(session, poi_id, user.id)
    if item is None:
        item = Wishlist(poi_id=poi_id, user_id=user.id)
        session.add(item)
        session.commit()
        session.refresh(item)
    return item


@router.get("/{poi_id}/wishlist", response_model=list[WishlistRead])
def list_wishlist(poi_id: int, session: SessionDep, _: CurrentUser) -> list[Wishlist]:
    return session.exec(select(Wishlist).where(Wishlist.poi_id == poi_id)).all()


@router.delete("/{poi_id}/wishlist", status_code=status.HTTP_204_NO_CONTENT)
def remove_wishlist(poi_id: int, session: SessionDep, user: CurrentUser) -> Response:
    item = _existing(session, poi_id, user.id)
    if item:
        session.delete(item)
        session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
```

- [ ] **Step 6: Register the router in `backend/app/main.py`**

```python
app.include_router(wishlist.router)
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `python -m pytest tests/test_wishlist.py -v`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/app/models.py backend/app/schemas.py backend/app/routers/wishlist.py backend/app/main.py backend/tests/test_wishlist.py
git commit -m "feat(backend): per-user wishlist"
```

---

### Task 12: Comments

**Files:**
- Modify: `backend/app/models.py` (add `Comment`)
- Modify: `backend/app/schemas.py` (add `CommentCreate`, `CommentRead`)
- Create: `backend/app/routers/comments.py`
- Modify: `backend/app/main.py` (register router)
- Test: `backend/tests/test_comments.py`

**Interfaces:**
- Consumes: `CurrentUser`, `SessionDep`, `models.POI`
- Produces:
  - `app.models.Comment { id, poi_id, user_id, text, created_at }`
  - `app.schemas.CommentCreate { text }`
  - `app.schemas.CommentRead { id, poi_id, user_id, username, text, created_at }`
  - Endpoints: `GET/POST /api/pois/{poi_id}/comments`, `DELETE /api/pois/{poi_id}/comments/{comment_id}` (author or admin)

- [ ] **Step 1: Write the failing test `backend/tests/test_comments.py`**

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_comments.py -v`
Expected: FAIL — 404 on the comments route.

- [ ] **Step 3: Add the model to `backend/app/models.py`**

```python
class Comment(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    poi_id: int = Field(foreign_key="poi.id")
    user_id: int = Field(foreign_key="user.id")
    text: str
    created_at: datetime = Field(default_factory=utcnow)
```

- [ ] **Step 4: Add schemas to `backend/app/schemas.py`**

```python
class CommentCreate(SQLModel):
    text: str


class CommentRead(SQLModel):
    id: int
    poi_id: int
    user_id: int
    username: str
    text: str
    created_at: datetime
```

- [ ] **Step 5: Implement `backend/app/routers/comments.py`**

```python
from fastapi import APIRouter, HTTPException, Response, status
from sqlmodel import select

from ..deps import CurrentUser, SessionDep
from ..models import POI, Comment, Role, User
from ..schemas import CommentCreate, CommentRead

router = APIRouter(prefix="/api/pois", tags=["comments"])


def _to_read(session: SessionDep, comment: Comment) -> CommentRead:
    user = session.get(User, comment.user_id)
    return CommentRead(
        id=comment.id,
        poi_id=comment.poi_id,
        user_id=comment.user_id,
        username=user.username if user else "(deleted)",
        text=comment.text,
        created_at=comment.created_at,
    )


@router.get("/{poi_id}/comments", response_model=list[CommentRead])
def list_comments(poi_id: int, session: SessionDep, _: CurrentUser) -> list[CommentRead]:
    comments = session.exec(
        select(Comment).where(Comment.poi_id == poi_id).order_by(Comment.created_at)
    ).all()
    return [_to_read(session, c) for c in comments]


@router.post("/{poi_id}/comments", response_model=CommentRead, status_code=status.HTTP_201_CREATED)
def create_comment(
    poi_id: int, body: CommentCreate, session: SessionDep, user: CurrentUser
) -> CommentRead:
    if not session.get(POI, poi_id):
        raise HTTPException(status_code=404, detail="Not found")
    comment = Comment(poi_id=poi_id, user_id=user.id, text=body.text)
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return _to_read(session, comment)


@router.delete("/{poi_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    poi_id: int, comment_id: int, session: SessionDep, user: CurrentUser
) -> Response:
    comment = session.get(Comment, comment_id)
    if not comment or comment.poi_id != poi_id:
        raise HTTPException(status_code=404, detail="Not found")
    if comment.user_id != user.id and user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not allowed")
    session.delete(comment)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
```

- [ ] **Step 6: Register the router in `backend/app/main.py`**

```python
app.include_router(comments.router)
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `python -m pytest tests/test_comments.py -v`
Expected: PASS (2 passed).

- [ ] **Step 8: Commit**

```bash
git add backend/app/models.py backend/app/schemas.py backend/app/routers/comments.py backend/app/main.py backend/tests/test_comments.py
git commit -m "feat(backend): per-user comment threads"
```

---

### Task 13: Settings singleton (with encrypted TRIP credentials)

**Files:**
- Modify: `backend/app/models.py` (add `Settings`)
- Modify: `backend/app/schemas.py` (add `SettingsRead`, `SettingsUpdate`)
- Create: `backend/app/routers/settings.py`
- Modify: `backend/app/main.py` (register router)
- Test: `backend/tests/test_settings.py`

**Interfaces:**
- Consumes: `CurrentUser`, `AdminUser`, `SessionDep`, `crypto.encrypt/decrypt`
- Produces:
  - `app.models.Settings` (single row, `id=1`): `trip_base_url, trip_username, trip_password_enc, trip_sync_enabled, trip_sync_interval_seconds, trip_conflict_policy, google_api_key_enc, nominatim_url, map_tile_url, default_map_center_lat, default_map_center_lng, default_map_zoom`
  - `app.models.get_or_create_settings(session) -> Settings`
  - `app.schemas.SettingsRead` (secrets exposed only as booleans `trip_password_set` / `google_api_key_set`)
  - `app.schemas.SettingsUpdate` (all optional; secrets accepted as plaintext, stored encrypted; empty string clears)
  - Endpoints: `GET /api/settings -> SettingsRead` (any authenticated user — the frontend needs map defaults), `PATCH /api/settings -> SettingsRead` (admin only)

- [ ] **Step 1: Write the failing test `backend/tests/test_settings.py`**

```python
def _setup_admin(client):
    client.post("/api/auth/setup", json={"username": "admin", "password": "pw"})


def test_settings_defaults_and_secret_handling(client):
    _setup_admin(client)
    got = client.get("/api/settings").json()
    assert got["map_tile_url"]  # has a default
    assert got["trip_conflict_policy"] == "minimalpoi_wins"
    assert got["trip_password_set"] is False

    # set a TRIP password; it is stored but never returned
    patched = client.patch("/api/settings", json={
        "trip_base_url": "https://trip.lan",
        "trip_username": "me",
        "trip_password": "s3cret",
    }).json()
    assert patched["trip_username"] == "me"
    assert patched["trip_password_set"] is True
    assert "trip_password" not in patched
    assert "trip_password_enc" not in patched

    # empty string clears the password
    cleared = client.patch("/api/settings", json={"trip_password": ""}).json()
    assert cleared["trip_password_set"] is False


def test_settings_patch_admin_only(client):
    _setup_admin(client)
    client.post("/api/users", json={"username": "bob", "password": "pw"})
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "bob", "password": "pw"})
    assert client.get("/api/settings").status_code == 200      # readable by members
    assert client.patch("/api/settings", json={"map_tile_url": "x"}).status_code == 403


def test_trip_password_is_encrypted_and_recoverable(client, data_dir):
    _setup_admin(client)
    client.patch("/api/settings", json={"trip_password": "s3cret"})
    from sqlmodel import Session
    from app import db
    from app.crypto import decrypt
    from app.models import Settings
    with Session(db.engine) as session:
        row = session.get(Settings, 1)
        assert row.trip_password_enc and row.trip_password_enc != "s3cret"
        assert decrypt(row.trip_password_enc) == "s3cret"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_settings.py -v`
Expected: FAIL — 404 on `/api/settings`.

- [ ] **Step 3: Add the model + helper to `backend/app/models.py`**

```python
class Settings(SQLModel, table=True):
    id: int | None = Field(default=1, primary_key=True)
    trip_base_url: str | None = Field(default=None)
    trip_username: str | None = Field(default=None)
    trip_password_enc: str | None = Field(default=None)
    trip_sync_enabled: bool = Field(default=False)
    trip_sync_interval_seconds: int = Field(default=300)
    trip_conflict_policy: str = Field(default="minimalpoi_wins")
    google_api_key_enc: str | None = Field(default=None)
    nominatim_url: str | None = Field(default="https://nominatim.openstreetmap.org")
    map_tile_url: str = Field(
        default="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    )
    default_map_center_lat: float = Field(default=52.3676)
    default_map_center_lng: float = Field(default=4.9041)
    default_map_zoom: float = Field(default=11.0)


def get_or_create_settings(session) -> "Settings":
    row = session.get(Settings, 1)
    if row is None:
        row = Settings(id=1)
        session.add(row)
        session.commit()
        session.refresh(row)
    return row
```

- [ ] **Step 4: Add schemas to `backend/app/schemas.py`**

```python
class SettingsRead(SQLModel):
    trip_base_url: str | None
    trip_username: str | None
    trip_password_set: bool
    trip_sync_enabled: bool
    trip_sync_interval_seconds: int
    trip_conflict_policy: str
    google_api_key_set: bool
    nominatim_url: str | None
    map_tile_url: str
    default_map_center_lat: float
    default_map_center_lng: float
    default_map_zoom: float


class SettingsUpdate(SQLModel):
    trip_base_url: str | None = None
    trip_username: str | None = None
    trip_password: str | None = None
    trip_sync_enabled: bool | None = None
    trip_sync_interval_seconds: int | None = None
    trip_conflict_policy: str | None = None
    google_api_key: str | None = None
    nominatim_url: str | None = None
    map_tile_url: str | None = None
    default_map_center_lat: float | None = None
    default_map_center_lng: float | None = None
    default_map_zoom: float | None = None
```

- [ ] **Step 5: Implement `backend/app/routers/settings.py`**

```python
from fastapi import APIRouter

from ..crypto import encrypt
from ..deps import AdminUser, CurrentUser, SessionDep
from ..models import Settings, get_or_create_settings
from ..schemas import SettingsRead, SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])

# Fields whose plaintext is encrypted into a *_enc column.
SECRET_FIELDS = {"trip_password": "trip_password_enc", "google_api_key": "google_api_key_enc"}


def _to_read(s: Settings) -> SettingsRead:
    return SettingsRead(
        trip_base_url=s.trip_base_url,
        trip_username=s.trip_username,
        trip_password_set=bool(s.trip_password_enc),
        trip_sync_enabled=s.trip_sync_enabled,
        trip_sync_interval_seconds=s.trip_sync_interval_seconds,
        trip_conflict_policy=s.trip_conflict_policy,
        google_api_key_set=bool(s.google_api_key_enc),
        nominatim_url=s.nominatim_url,
        map_tile_url=s.map_tile_url,
        default_map_center_lat=s.default_map_center_lat,
        default_map_center_lng=s.default_map_center_lng,
        default_map_zoom=s.default_map_zoom,
    )


@router.get("", response_model=SettingsRead)
def read_settings(session: SessionDep, _: CurrentUser) -> SettingsRead:
    return _to_read(get_or_create_settings(session))


@router.patch("", response_model=SettingsRead)
def update_settings(body: SettingsUpdate, session: SessionDep, _: AdminUser) -> SettingsRead:
    s = get_or_create_settings(session)
    data = body.model_dump(exclude_unset=True)
    for plain_field, enc_field in SECRET_FIELDS.items():
        if plain_field in data:
            value = data.pop(plain_field)
            setattr(s, enc_field, encrypt(value) if value else None)
    for key, value in data.items():
        setattr(s, key, value)
    session.add(s)
    session.commit()
    session.refresh(s)
    return _to_read(s)
```

- [ ] **Step 6: Register the router in `backend/app/main.py`**

```python
app.include_router(settings.router)
```

The final import line in `main.py` should now read:

```python
from .routers import auth, categories, comments, pois, settings, teams, users, visits, wishlist
```

with one `app.include_router(...)` call per router.

- [ ] **Step 7: Run the full suite**

Run: `python -m pytest -v`
Expected: PASS (all tests across every file green).

- [ ] **Step 8: Commit**

```bash
git add backend/app/models.py backend/app/schemas.py backend/app/routers/settings.py backend/app/main.py backend/tests/test_settings.py
git commit -m "feat(backend): settings singleton with encrypted TRIP credentials"
```

---

### Task 14: Continuous integration (test on push/PR)

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.gitattributes` (normalize line endings so the repo is stable across Windows/Linux/CI)

**Interfaces:**
- Consumes: the `backend/` package and its `[dev]` extras (pytest, httpx).
- Produces: a `backend-tests` GitHub Actions job that fails the build on any test failure. Extended with a frontend job in Plan 4.

> Prerequisite: the repository must be pushed to GitHub for Actions to run. This task only adds the workflow file; pushing/creating the remote is a one-time manual step (e.g. `gh repo create`).

- [ ] **Step 1: Create `.gitattributes`**

```gitattributes
* text=auto eol=lf
*.png binary
*.woff2 binary
*.ico binary
```

- [ ] **Step 2: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Install dependencies
        run: pip install -e ".[dev]"
      - name: Run tests
        run: python -m pytest -v
```

- [ ] **Step 3: Validate the workflow YAML parses**

Run (from repo root): `python -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml')); print('ok')"`
Expected: `ok` (no YAML error). If PyYAML is unavailable, instead confirm the file matches the block above exactly.

- [ ] **Step 4: Reproduce the CI command locally to prove it's green**

Run (from `backend/`): `python -m pytest -v`
Expected: PASS (full suite green — the same command CI runs).

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml .gitattributes
git commit -m "ci: run backend test suite on push and PR"
```

---

## Self-Review

**Spec coverage (Plan 1 scope):**
- Config/secret bootstrap, zero-env → Task 1. ✅
- SQLite/SQLModel, `data/` layout → Task 2, Task 13 (settings). ✅
- First-run setup screen backend → Task 5. ✅
- JWT-cookie auth + roles → Tasks 3, 4, 5. ✅
- Admin-only account creation / disable → Task 6. ✅
- Teams + membership → Task 7. ✅
- Categories + TRIP-category mapping field → Task 8. ✅
- Shared POIs + all reference fields + sync-state fields + tombstones → Task 9. ✅
- Duplicate detection (source-url + name+proximity) → Task 9. ✅
- Per-user visits with team + rating; preferred team → Task 10. ✅
- Wishlist → Task 11. ✅
- Comments (attributed, author/admin delete) → Task 12. ✅
- Settings singleton incl. encrypted TRIP creds, sync interval, conflict policy default `minimalpoi_wins`, map defaults, tile url, nominatim url → Task 13. ✅
- CI workflow (backend test suite on push/PR) → Task 14. ✅
- *Deferred to later plans (correctly out of scope here):* enrichment (Plan 2), TRIP sync engine + client (Plan 3), frontend/static serving + CI frontend job (Plan 4), GeoJSON + full backup/restore + Docker + release-please/GHCR publishing (Plan 5).

**Placeholder scan:** No TBD/TODO; every code step contains complete code. ✅

**Type consistency:** `SessionDep`/`CurrentUser`/`AdminUser` defined in Task 4 and reused verbatim. `SyncStatus`/`POI`/`Tombstone` defined in Task 9 and used by visits/wishlist/comments/settings. `get_or_create_settings` defined once (Task 13). `utcnow` defined in Task 2 and imported where needed. `find_duplicate`/`haversine_m` signatures match their test usage. Cookie name constant `access_token` consistent between `auth.py` and `deps.py`. ✅

---

## Plan Roadmap (subsequent plans)

These will each get their own fully-detailed plan document when we reach them:

- **Plan 2 — Enrichment service:** `POST /api/enrich {url}` returning a draft POI; link-type detection; Google Maps URL coordinate extraction + shortlink resolution; OpenGraph + JSON-LD parsing; optional Google Places (admin key); Nominatim fallback; local image download/upload to `data/images/`. Tested against saved HTML fixtures.
- **Plan 3 — Two-way TRIP sync engine:** authenticated TRIP client (login/refresh/re-login), field mapping, snapshot-diff change detection, reconcile pass (create/import/update/delete), conflict policy, tombstone handling, loop prevention, background worker + on-change trigger, "Sync now", initial reconcile with duplicate-linking. Tested against a mocked TRIP API.
- **Plan 4 — Frontend:** React + Vite + Tailwind + MapLibre, design ported from `/reference`; first-run setup + login; map + collapsible list + search/filters; place editor (map-pick coords, image upload, visited/rating/wishlist, comments); categories/teams admin; settings + conflict-resolution view; locally-bundled fonts/assets. **Extends `ci.yml`** with a frontend job (lint + `vitest` + `vite build`).
- **Plan 5 — Backup/restore + packaging + release automation:** GeoJSON import/export; full JSON backup/restore (all tables + images); FastAPI static serving of the built frontend; multi-stage `Dockerfile` (build frontend → serve from backend) + `docker-compose.yml` with a single `data/` volume; **release-please** workflow (Conventional Commits → version bump + `CHANGELOG.md` + GitHub Release) and a release-triggered job that builds and pushes the image to **GHCR** (`ghcr.io/<owner>/minimalpoi`) using the built-in `GITHUB_TOKEN`.
