import importlib.util
from pathlib import Path

import pytest

from app.db import _normalize_db_url, _engine_config, _scalar_default_sql

# psycopg is an optional extra; building a Postgres engine imports it. The SQLite
# CI job installs only `.[dev]`, so skip the Postgres-engine test when it's absent.
_HAS_PSYCOPG = importlib.util.find_spec("psycopg") is not None


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
