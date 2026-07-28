import os

import pytest
from sqlalchemy import func, select as sa_select
from sqlmodel import Session, SQLModel, create_engine

from app.migrate_sqlite_to_postgres import (
    MigrationError, migrate, _require_postgres_target, _require_empty_target,
)


def _sqlite(path):
    return create_engine(f"sqlite:///{path}", connect_args={"check_same_thread": False})


def _seed_source(engine):
    """Create the schema and insert at least one row in the core tables,
    including a route with nodes and an API token (the backup's blind spots).

    NOTE: the class is `POI` (uppercase). `Category`, `POI`, and `Route` each
    have a NOT NULL `created_by` FK to user.id — it MUST be set or the insert
    fails. Verify every required field against backend/app/models.py."""
    from datetime import date

    import app.models as m
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        user = m.User(username="u", password_hash="x")
        s.add(user); s.commit(); s.refresh(user)
        cat = m.Category(name="Food", created_by=user.id)
        s.add(cat); s.commit(); s.refresh(cat)
        poi = m.POI(name="P", lat=1.0, lng=2.0, category_id=cat.id, created_by=user.id)
        s.add(poi); s.commit()
        route = m.Route(name="R", start_date=date(2026, 7, 14), created_by=user.id)
        s.add(route); s.commit(); s.refresh(route)
        s.add(m.RouteNode(route_id=route.id, kind="stop", position=1.0, name="A", lat=1.0, lng=2.0))
        s.add(m.ApiToken(user_id=user.id, name="t", token_hash="h", prefix="ab12cd34"))
        s.commit()


def test_require_postgres_target_rejects_sqlite(tmp_path):
    eng = _sqlite(tmp_path / "t.db")
    with pytest.raises(MigrationError):
        _require_postgres_target(eng)
    eng.dispose()


def test_require_empty_target_rejects_populated(tmp_path):
    eng = _sqlite(tmp_path / "t.db")
    _seed_source(eng)
    with pytest.raises(MigrationError):
        _require_empty_target(eng)
    eng.dispose()


def test_require_empty_target_allows_empty(tmp_path):
    eng = _sqlite(tmp_path / "t.db")
    SQLModel.metadata.create_all(eng)
    _require_empty_target(eng)  # no raise
    eng.dispose()


# --- Full copy: needs a real Postgres; gated on TEST_POSTGRES_URL (set in CI) ---
POSTGRES_URL = os.environ.get("TEST_POSTGRES_URL") or (
    os.environ.get("DATABASE_URL") if (os.environ.get("DATABASE_URL", "").startswith(("postgres://", "postgresql")))
    else None
)


@pytest.mark.skipif(POSTGRES_URL is None, reason="needs a real Postgres (set TEST_POSTGRES_URL)")
def test_full_copy_preserves_rows_and_resets_sequences(tmp_path):
    from app.db import _normalize_db_url, _add_missing_columns
    import app.models as m

    source = _sqlite(tmp_path / "src.db")
    _seed_source(source)
    target = create_engine(_normalize_db_url(POSTGRES_URL))
    # clean slate on the shared CI Postgres
    SQLModel.metadata.drop_all(target)
    SQLModel.metadata.create_all(target)
    _add_missing_columns(target)

    counts = migrate(source, target)
    assert counts["poi"] == 1
    assert counts["route"] == 1
    assert counts["routenode"] == 1
    assert counts["apitoken"] == 1   # the backup omits this table; the migration must not

    # sequence reset: a fresh ORM insert must get a non-colliding id
    with Session(target) as s:
        user_id = s.exec(sa_select(m.User.id)).first()[0]
        before = s.exec(sa_select(func.max(m.POI.id))).one()[0]
        s.add(m.POI(name="P2", lat=3.0, lng=4.0, created_by=user_id)); s.commit()
        after = s.exec(sa_select(func.max(m.POI.id))).one()[0]
        assert after == before + 1
    SQLModel.metadata.drop_all(target)
    source.dispose()
    target.dispose()


@pytest.mark.skipif(POSTGRES_URL is None, reason="needs a real Postgres (set TEST_POSTGRES_URL)")
def test_migration_repairs_orphans(tmp_path):
    from sqlmodel import select as sm_select  # returns model instances via Session.exec

    from app.db import _normalize_db_url, _add_missing_columns
    import app.models as m

    source = _sqlite(tmp_path / "src.db")
    _seed_source(source)                         # a route + node + poi + user
    with Session(source) as s:
        # orphan a RouteNode.poi_id (delete the POI row directly — SQLite allows it)
        poi = s.exec(sm_select(m.POI)).first()
        node = s.exec(sm_select(m.RouteNode)).first()
        node.poi_id = poi.id; s.add(node); s.delete(poi); s.commit()

    target = create_engine(_normalize_db_url(POSTGRES_URL))
    SQLModel.metadata.drop_all(target); SQLModel.metadata.create_all(target); _add_missing_columns(target)
    counts = migrate(source, target)             # must NOT raise
    with Session(target) as s:
        node = s.exec(sm_select(m.RouteNode)).first()
        assert node.poi_id is None               # orphan nulled, not a FK violation
    SQLModel.metadata.drop_all(target)
    source.dispose()
    target.dispose()


@pytest.mark.skipif(POSTGRES_URL is None, reason="needs a real Postgres (set TEST_POSTGRES_URL)")
def test_migration_reassigns_orphaned_owner_fk_to_sentinel(tmp_path):
    """A POI whose creator was deleted (created_by orphaned, NOT NULL column)
    must be reassigned to the __deleted_user__ sentinel, not dropped or nulled —
    and the sentinel row itself must land in the target."""
    from sqlmodel import select as sm_select

    from app.db import _normalize_db_url, _add_missing_columns
    import app.models as m

    source = _sqlite(tmp_path / "src.db")
    _seed_source(source)                         # a route + node + poi + user "u"
    with Session(source) as s:
        # Orphan the POI's created_by by deleting its creator directly
        # (SQLite never enforced the FK, so this leaves a dangling reference).
        poi = s.exec(sm_select(m.POI)).first()
        user = s.get(m.User, poi.created_by)
        s.delete(user); s.commit()

    target = create_engine(_normalize_db_url(POSTGRES_URL))
    SQLModel.metadata.drop_all(target); SQLModel.metadata.create_all(target); _add_missing_columns(target)
    migrate(source, target)                       # must NOT raise

    with Session(target) as s:
        sentinel = s.exec(sm_select(m.User).where(m.User.username == m.DELETED_USERNAME)).first()
        assert sentinel is not None
        assert sentinel.disabled is True

        poi = s.exec(sm_select(m.POI)).first()
        assert poi.created_by == sentinel.id

    SQLModel.metadata.drop_all(target)
    source.dispose()
    target.dispose()


@pytest.mark.skipif(POSTGRES_URL is None, reason="needs a real Postgres (set TEST_POSTGRES_URL)")
def test_clean_migration_does_not_add_sentinel_user(tmp_path):
    """No orphaned owner FK anywhere in the source: the __deleted_user__
    sentinel must never be injected — a clean migration's user count in the
    target must equal the source's, not source + 1."""
    from sqlmodel import select as sm_select

    from app.db import _normalize_db_url, _add_missing_columns
    import app.models as m

    source = _sqlite(tmp_path / "src.db")
    _seed_source(source)                          # no deletions — nothing orphaned

    with Session(source) as s:
        source_user_count = len(s.exec(sm_select(m.User)).all())

    target = create_engine(_normalize_db_url(POSTGRES_URL))
    SQLModel.metadata.drop_all(target); SQLModel.metadata.create_all(target); _add_missing_columns(target)
    counts = migrate(source, target)               # must NOT raise

    assert counts["user"] == source_user_count

    with Session(target) as s:
        target_users = s.exec(sm_select(m.User)).all()
        assert len(target_users) == source_user_count
        assert not any(u.username == m.DELETED_USERNAME for u in target_users)

    SQLModel.metadata.drop_all(target)
    source.dispose()
    target.dispose()
