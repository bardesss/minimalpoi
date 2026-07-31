import importlib.util
import os
from pathlib import Path

import pytest

from app.db import _normalize_db_url, _engine_config, _scalar_default_sql

# psycopg is an optional extra; building a Postgres engine imports it. The SQLite
# CI job installs only `.[dev]`, so skip the Postgres-engine test when it's absent.
_HAS_PSYCOPG = importlib.util.find_spec("psycopg") is not None

# Same gate the other Postgres-only suites use: a real server, or skip.
POSTGRES = (os.environ.get("TEST_POSTGRES_URL")
            or (os.environ.get("DATABASE_URL") if os.environ.get("DATABASE_URL", "").startswith(("postgres://", "postgresql")) else None))


class _Default:
    def __init__(self, value):
        self.is_scalar = True
        self.arg = value


class _Col:
    def __init__(self, value):
        self.default = _Default(value)


@pytest.mark.parametrize("raw,expected", [
    ("postgres://u:p@h:5432/db", "postgresql+psycopg://u:p@h:5432/db"),
    ("postgresql://u:p@h:5432/db", "postgresql+psycopg://u:p@h:5432/db"),
    ("postgresql+psycopg://u:p@h:5432/db", "postgresql+psycopg://u:p@h:5432/db"),
    ("sqlite:////data/minimalpoi.db", "sqlite:////data/minimalpoi.db"),
])
def test_normalize_db_url(raw, expected):
    assert _normalize_db_url(raw) == expected


def test_engine_config_defaults_to_sqlite_when_unset(tmp_path):
    url, connect_args = _engine_config(None, tmp_path)
    assert url == f"sqlite:///{tmp_path / 'minimalpoi.db'}"
    assert connect_args == {"check_same_thread": False}


def test_engine_config_postgres_has_no_check_same_thread(tmp_path):
    url, connect_args = _engine_config("postgres://u:p@h/db", tmp_path)
    assert url == "postgresql+psycopg://u:p@h/db"
    assert connect_args == {}


def test_engine_config_explicit_sqlite_keeps_check_same_thread(tmp_path):
    url, connect_args = _engine_config("sqlite:////tmp/x.db", tmp_path)
    assert connect_args == {"check_same_thread": False}


def test_scalar_default_sql_boolean_is_dialect_aware():
    assert _scalar_default_sql(_Col(True), "sqlite") == "1"
    assert _scalar_default_sql(_Col(False), "sqlite") == "0"
    assert _scalar_default_sql(_Col(True), "postgresql") == "TRUE"
    assert _scalar_default_sql(_Col(False), "postgresql") == "FALSE"


def test_scalar_default_sql_non_bool_unchanged():
    assert _scalar_default_sql(_Col(0), "postgresql") == "0"      # int, not bool
    assert _scalar_default_sql(_Col("x"), "postgresql") == "'x'"


@pytest.mark.skipif(not _HAS_PSYCOPG, reason="psycopg not installed (optional postgres extra)")
def test_reset_engine_uses_database_url(monkeypatch, tmp_path):
    monkeypatch.setenv("MINIMALPOI_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("DATABASE_URL", "postgres://u:p@h:5432/db")
    from app import db
    db.reset_engine()
    assert db.engine.url.get_backend_name() == "postgresql"
    assert db.engine.url.get_driver_name() == "psycopg"
    db.reset_engine()  # dispose


@pytest.mark.skipif(POSTGRES is None, reason="needs a real Postgres")
def test_add_missing_indexes_backfills_on_postgres():
    """The index backfill is dialect-agnostic DDL, but self-hosters on Postgres
    are exactly who has a long-lived database predating an index — so prove it
    against a real server, not just SQLite."""
    from sqlalchemy import create_engine, inspect, text
    from sqlmodel import SQLModel

    from app import db
    from app import models  # noqa: F401 — registers all tables on SQLModel.metadata

    engine = create_engine(POSTGRES)
    SQLModel.metadata.create_all(engine)

    def indexed_columns() -> set[str]:
        return {c for ix in inspect(engine).get_indexes("poi") for c in ix["column_names"]}

    # Drop just this one index (leaving constraint-backed ones alone, which
    # Postgres refuses to DROP INDEX anyway) to simulate a database created
    # before POI.category_id was indexed.
    with engine.begin() as conn:
        conn.execute(text("DROP INDEX IF EXISTS ix_poi_category_id"))
    assert "category_id" not in indexed_columns()

    db._add_missing_indexes(engine)

    assert "category_id" in indexed_columns()
    db._add_missing_indexes(engine)  # idempotent
    engine.dispose()
