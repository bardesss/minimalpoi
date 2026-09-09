from sqlalchemy import create_engine, inspect, text
from sqlmodel import SQLModel

import app.db as dbmod
from app import models  # noqa: F401 — registers all tables on SQLModel.metadata


def _cols(engine, table: str) -> set[str]:
    return {c["name"] for c in inspect(engine).get_columns(table)}


def test_add_missing_columns_backfills_a_late_added_column(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'old.db'}")
    # Simulate a database created before later columns existed: a `settings`
    # table with only its primary key. create_all() then builds every *other*
    # table in full but leaves this pre-existing one untouched.
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE settings (id INTEGER PRIMARY KEY)"))
    SQLModel.metadata.create_all(engine)

    cols = _cols(engine, "settings")
    assert "nominatim_url" not in cols  # a column added after settings first shipped
    assert "google_api_key_enc" not in cols

    dbmod._add_missing_columns(engine)

    cols = _cols(engine, "settings")
    assert "nominatim_url" in cols
    assert "google_api_key_enc" in cols  # other nullable columns are backfilled too
    engine.dispose()


def test_add_missing_columns_is_idempotent_on_a_fresh_db(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'fresh.db'}")
    SQLModel.metadata.create_all(engine)
    before = _cols(engine, "settings")
    dbmod._add_missing_columns(engine)  # nothing missing → no-op, no error
    assert _cols(engine, "settings") == before
    engine.dispose()


def test_hot_filter_columns_are_indexed_in_metadata():
    from app.models import POI, Comment
    assert POI.__table__.columns["category_id"].index is True
    assert Comment.__table__.columns["poi_id"].index is True


def test_indexes_are_created_on_a_fresh_db(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'fresh.db'}")
    SQLModel.metadata.create_all(engine)

    poi_indexed = {c for ix in inspect(engine).get_indexes("poi") for c in ix["column_names"]}
    comment_indexed = {c for ix in inspect(engine).get_indexes("comment") for c in ix["column_names"]}
    assert "category_id" in poi_indexed
    assert "poi_id" in comment_indexed
    engine.dispose()


def _indexed_columns(engine, table: str) -> set[str]:
    return {c for ix in inspect(engine).get_indexes(table) for c in ix["column_names"]}


def _drop_indexes(engine, table: str) -> None:
    """Drop every named index on a table, simulating a database created before
    those indexes were declared on the model."""
    names = [ix["name"] for ix in inspect(engine).get_indexes(table) if ix["name"]]
    with engine.begin() as conn:
        for name in names:
            conn.execute(text(f'DROP INDEX "{name}"'))


def test_add_missing_indexes_backfills_an_index_added_after_the_table_existed(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'old.db'}")
    SQLModel.metadata.create_all(engine)
    # A database created before POI.category_id / Comment.poi_id were indexed:
    # the tables exist, so create_all() leaves them entirely alone and the new
    # indexes never appear.
    _drop_indexes(engine, "poi")
    _drop_indexes(engine, "comment")
    SQLModel.metadata.create_all(engine)  # no-op for existing tables
    assert "category_id" not in _indexed_columns(engine, "poi")
    assert "poi_id" not in _indexed_columns(engine, "comment")

    dbmod._add_missing_indexes(engine)

    assert "category_id" in _indexed_columns(engine, "poi")
    assert "poi_id" in _indexed_columns(engine, "comment")
    engine.dispose()


def test_add_missing_indexes_is_idempotent_on_a_fresh_db(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'fresh.db'}")
    SQLModel.metadata.create_all(engine)
    before = _indexed_columns(engine, "poi")
    dbmod._add_missing_indexes(engine)  # nothing missing → no-op, no error
    dbmod._add_missing_indexes(engine)  # and safe to run again
    assert _indexed_columns(engine, "poi") == before
    engine.dispose()


def test_init_db_backfills_indexes_on_an_existing_database(data_dir):
    """The end-to-end path a self-hoster actually hits: an existing DB that
    predates the index, upgraded by simply restarting the app."""
    from app import db

    db.reset_engine()
    db.init_db()
    _drop_indexes(db.engine, "poi")
    assert "category_id" not in _indexed_columns(db.engine, "poi")

    db.init_db()  # restart

    assert "category_id" in _indexed_columns(db.engine, "poi")
    db.reset_engine()


def test_route_tables_created(data_dir):
    from sqlalchemy import inspect
    from app import db
    db.reset_engine()
    db.init_db()
    tables = set(inspect(db.engine).get_table_names())
    assert {"route", "routenode", "routeleg", "routeattachment"} <= tables
    db.reset_engine()


# `{status}` and `{timestamp}` are filled in per dialect by
# `_seed_pre_removal_schema`: Postgres has no DATETIME type, and the old
# SyncStatus enum was a native `syncstatus` type there rather than a VARCHAR.
_PRE_REMOVAL_COLUMNS = {
    "poi": ["trip_place_id INTEGER", "trip_sync_status {status}", "trip_synced_snapshot JSON",
            "trip_synced_at {timestamp}", "trip_last_error VARCHAR"],
    "category": ["trip_category_id INTEGER", "trip_sync_status {status}", "trip_synced_snapshot JSON",
                 "trip_synced_at {timestamp}", "trip_last_error VARCHAR"],
    "settings": ["trip_base_url VARCHAR", "trip_username VARCHAR", "trip_password_enc VARCHAR",
                 "trip_sync_enabled BOOLEAN", "trip_sync_interval_seconds INTEGER",
                 "trip_conflict_policy VARCHAR", "trip_last_sync_at {timestamp}"],
}

_SYNCSTATUS_VALUES = "'local_only','pending','synced','conflict','error'"


def _seed_pre_removal_schema(engine) -> None:
    """Put back the schema a pre-v4 database carries: the trip_* columns and
    the tombstone table.

    Dialect-aware. On SQLite this is exactly what it always did. On Postgres,
    DATETIME does not exist (TIMESTAMP does), and SQLModel mapped the old
    `SyncStatus` enum to a native `syncstatus` type — recreating that type here
    is what gives the purge's DROP TYPE step something real to remove."""
    sqlite = engine.dialect.name == "sqlite"
    types = {
        "timestamp": "DATETIME" if sqlite else "TIMESTAMP",
        "status": "VARCHAR" if sqlite else "syncstatus",
    }
    with engine.begin() as conn:
        if not sqlite:
            # The shared CI database may still carry the type from an earlier
            # test, and CREATE TYPE has no IF NOT EXISTS — look first rather
            # than let a duplicate-object error poison the transaction.
            if not _syncstatus_exists(conn):
                conn.execute(text(f"CREATE TYPE syncstatus AS ENUM ({_SYNCSTATUS_VALUES})"))
        for table, columns in _PRE_REMOVAL_COLUMNS.items():
            for column in columns:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column.format(**types)}"))
        conn.execute(text(
            "CREATE TABLE tombstone (id INTEGER PRIMARY KEY, entity_type VARCHAR, "
            f"trip_id INTEGER, origin VARCHAR, created_at {types['timestamp']})"
        ))


def _syncstatus_exists(conn) -> bool:
    """Postgres only: is the native `syncstatus` enum type present?"""
    return conn.execute(text("SELECT 1 FROM pg_type WHERE typname = 'syncstatus'")).first() is not None


def _reset_schema(engine) -> None:
    """Start these tests from an empty schema.

    SQLite gets a fresh temp file per test from the `data_dir` fixture, but the
    Postgres CI job reuses ONE database across every test, so leftovers leak in
    both directions. Mirrors the `client` fixture in conftest.py, plus the two
    objects this module creates by hand that SQLModel.metadata knows nothing
    about: the tombstone table and the seeded `syncstatus` type (dropped after
    drop_all, since a type cannot go while a column still uses it)."""
    if engine.dialect.name == "sqlite":
        return
    SQLModel.metadata.drop_all(engine)
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS tombstone"))
        conn.execute(text("DROP TYPE IF EXISTS syncstatus"))


def _trip_columns(engine, table: str) -> set[str]:
    return {c for c in _cols(engine, table) if c.startswith("trip_")}


def test_init_db_purges_the_trip_sync_schema(data_dir):
    """The upgrade path a self-hoster hits: a pre-v4 database, upgraded by
    restarting the app. The columns, the table and the sync account go, and
    content the sync account created survives under the deleted-user
    placeholder."""
    from datetime import date

    from sqlmodel import Session, select
    from app import db
    from app.models import (POI, Category, Comment, DELETED_USERNAME, Route, RouteShare,
                            Team, User)

    db.reset_engine()
    _reset_schema(db.engine)
    db.init_db()
    _seed_pre_removal_schema(db.engine)
    with Session(db.engine) as session:
        ghost = User(username="__trip_sync__", password_hash="!", disabled=True)
        session.add(ghost)
        session.commit()
        session.refresh(ghost)
        # The old sync engine created Categories as the ghost as well as POIs;
        # Team / Route / RouteShare round out the created_by tables that
        # `_retire_sync_account` has to reassign before it can delete the account.
        category = Category(name="Imported category", created_by=ghost.id)
        team = Team(name="Imported team", created_by=ghost.id)
        session.add(category)
        session.add(team)
        session.commit()
        session.refresh(category)
        poi = POI(name="Imported place", lat=1.0, lng=2.0,
                  category_id=category.id, created_by=ghost.id)
        route = Route(name="Imported route", start_date=date(2026, 7, 14), created_by=ghost.id)
        session.add(poi)
        session.add(route)
        session.commit()
        session.refresh(poi)
        session.refresh(route)
        session.add(RouteShare(token="imported-share", route_id=route.id, created_by=ghost.id))
        # A row on a table with ondelete="CASCADE" (Comment.user_id): Postgres
        # would drop this on its own when the ghost account is deleted, but
        # SQLite never enforces that cascade, so the purge must delete it
        # explicitly — same as delete_user does for a real account.
        session.add(Comment(poi_id=poi.id, user_id=ghost.id, text="synced note"))
        session.commit()

    def assert_purged() -> None:
        assert "tombstone" not in set(inspect(db.engine).get_table_names())
        for table in ("poi", "category", "settings"):
            assert _trip_columns(db.engine, table) == set()
        if db.engine.dialect.name == "postgresql":
            # Dropping the columns does not drop the native enum type they used.
            with db.engine.connect() as conn:
                assert not _syncstatus_exists(conn)
        with Session(db.engine) as session:
            assert session.exec(select(User).where(User.username == "__trip_sync__")).first() is None
            placeholder = session.exec(
                select(User).where(User.username == DELETED_USERNAME)).first()
            assert placeholder is not None
            # Everything is read *inside* the session: a closed Session leaves
            # its objects detached, and leaning on close() not expiring them is
            # a fragile way to keep reading attributes afterwards.
            owned = {
                "poi": session.exec(select(POI).where(POI.name == "Imported place")).first(),
                "category": session.exec(
                    select(Category).where(Category.name == "Imported category")).first(),
                "team": session.exec(select(Team).where(Team.name == "Imported team")).first(),
                "route": session.exec(select(Route).where(Route.name == "Imported route")).first(),
                "share": session.exec(
                    select(RouteShare).where(RouteShare.token == "imported-share")).first(),
            }
            for label, row in owned.items():
                assert row is not None, label
                assert row.created_by == placeholder.id, label
            assert session.exec(select(Comment).where(Comment.text == "synced note")).first() is None

    assert _trip_columns(db.engine, "settings")
    assert "tombstone" in set(inspect(db.engine).get_table_names())
    if db.engine.dialect.name == "postgresql":
        with db.engine.connect() as conn:
            assert _syncstatus_exists(conn)

    db.init_db()  # the upgrade restart

    assert_purged()

    db.init_db()  # a second restart — must still be a no-op after a real purge

    assert_purged()
    db.reset_engine()


def test_trip_purge_is_a_no_op_on_a_clean_database(data_dir):
    from app import db

    db.reset_engine()
    _reset_schema(db.engine)
    db.init_db()
    before = {t: _cols(db.engine, t) for t in ("poi", "category", "settings")}

    db.init_db()  # nothing left to purge — must not raise or change anything

    assert {t: _cols(db.engine, t) for t in ("poi", "category", "settings")} == before
    db.reset_engine()
