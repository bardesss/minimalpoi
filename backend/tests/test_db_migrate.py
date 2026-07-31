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
    assert "trip_last_sync_at" not in cols  # the column that broke the settings read
    assert "trip_base_url" not in cols

    dbmod._add_missing_columns(engine)

    cols = _cols(engine, "settings")
    assert "trip_last_sync_at" in cols
    assert "trip_base_url" in cols  # other nullable columns are backfilled too
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
