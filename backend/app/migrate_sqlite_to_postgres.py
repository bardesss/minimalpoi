"""One-shot copy of all data from the default SQLite DB into a Postgres target.

Iterates SQLModel.metadata.sorted_tables (FK-safe) rather than a hand-maintained
list, so it can't silently drop tables the ORM backup omits (routes, tokens,
tombstones). PKs are preserved and Postgres sequences reset afterward.
"""
import os
import sys
from pathlib import Path

from sqlalchemy import func, inspect, select, text
from sqlmodel import SQLModel, create_engine

from . import models  # noqa: F401 — importing registers every table on SQLModel.metadata
from .config import get_data_dir
from .db import _add_missing_columns, _engine_config


class MigrationError(RuntimeError):
    pass


def _require_postgres_target(target_engine) -> None:
    if target_engine.dialect.name == "sqlite":
        raise MigrationError(
            "DATABASE_URL must point at a Postgres database, not SQLite. "
            "Set it to e.g. postgresql+psycopg://user:pass@host:5432/minimalpoi."
        )


def _require_empty_target(target_engine) -> None:
    insp = inspect(target_engine)
    existing = set(insp.get_table_names())
    with target_engine.connect() as conn:
        for table in SQLModel.metadata.sorted_tables:
            if table.name not in existing:
                continue
            count = conn.execute(select(func.count()).select_from(table)).scalar_one()
            if count:
                raise MigrationError(
                    f"Target is not empty (table '{table.name}' has {count} rows). "
                    "Refusing to migrate into a populated database — start from a fresh Postgres."
                )


def _reset_sequences(target_engine) -> None:
    """After inserting explicit ids, advance each single-integer-PK sequence past
    MAX(id) so the next ORM insert doesn't collide. Postgres-only; composite or
    non-integer PKs (e.g. teammember) are skipped."""
    with target_engine.begin() as conn:
        for table in SQLModel.metadata.sorted_tables:
            pks = list(table.primary_key.columns)
            if len(pks) != 1:
                continue
            pk = pks[0]
            if not str(pk.type).upper().startswith(("INT", "BIGINT", "SMALLINT")):
                continue
            # Quote the identifiers in the inline subquery: a table name that is a
            # Postgres reserved word (e.g. "user") would otherwise be read as the
            # keyword rather than the table. pg_get_serial_sequence takes the names
            # as plain text params, so those stay unquoted.
            col_q = '"' + pk.name + '"'
            tbl_q = '"' + table.name + '"'
            conn.execute(text(
                "SELECT setval("
                "  pg_get_serial_sequence(:tbl, :col),"
                "  COALESCE((SELECT MAX(" + col_q + ") FROM " + tbl_q + "), 1),"
                "  (SELECT MAX(" + col_q + ") FROM " + tbl_q + ") IS NOT NULL"
                ")"
            ), {"tbl": table.name, "col": pk.name})


def migrate(source_engine, target_engine) -> dict[str, int]:
    _require_postgres_target(target_engine)
    _require_empty_target(target_engine)

    counts: dict[str, int] = {}
    with source_engine.connect() as src, target_engine.begin() as dst:
        for table in SQLModel.metadata.sorted_tables:
            rows = [dict(r._mapping) for r in src.execute(select(table))]
            if rows:
                dst.execute(table.insert(), rows)
            counts[table.name] = len(rows)
    _reset_sequences(target_engine)
    return counts


def main(argv: list[str] | None = None) -> int:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL is not set — nothing to migrate into.", file=sys.stderr)
        return 2
    target_url, connect_args = _engine_config(database_url, get_data_dir())
    if target_url.startswith("sqlite"):
        print("DATABASE_URL resolves to SQLite; set a Postgres URL to migrate.", file=sys.stderr)
        return 2

    source_url, source_args = _engine_config(None, get_data_dir())  # the default SQLite
    source_db = Path(source_url.replace("sqlite:///", ""))
    if not source_db.exists():
        print(f"No source SQLite database at {source_db}; nothing to migrate.", file=sys.stderr)
        return 2

    source_engine = create_engine(source_url, connect_args=source_args)
    target_engine = create_engine(target_url, connect_args=connect_args)
    # Ensure the target schema exists and is complete before copying.
    SQLModel.metadata.create_all(target_engine)
    _add_missing_columns(target_engine)

    try:
        counts = migrate(source_engine, target_engine)
    except MigrationError as exc:
        print(f"Migration refused: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:  # copy failed — transaction rolled back, target left empty
        print(f"Migration failed (target left unchanged): {exc}", file=sys.stderr)
        return 1

    for name, n in counts.items():
        print(f"  {name}: {n} rows")
    print("Migration complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
