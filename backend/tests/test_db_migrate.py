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


def test_route_tables_created(data_dir):
    from sqlalchemy import inspect
    from app import db
    db.reset_engine()
    db.init_db()
    tables = set(inspect(db.engine).get_table_names())
    assert {"route", "routenode", "routeleg", "routeattachment"} <= tables
    db.reset_engine()
