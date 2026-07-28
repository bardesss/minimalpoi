"""One-shot copy of all data from the default SQLite DB into a Postgres target.

Iterates SQLModel.metadata.sorted_tables (FK-safe) rather than a hand-maintained
list, so it can't silently drop tables the ORM backup omits (routes, tokens,
tombstones). PKs are preserved and Postgres sequences reset afterward.
"""
import logging
import os
import sys
from pathlib import Path

from sqlalchemy import func, inspect, select, text
from sqlmodel import SQLModel, create_engine

from . import models  # noqa: F401 — importing registers every table on SQLModel.metadata
from .config import get_data_dir
from .db import _add_missing_columns, _engine_config

logger = logging.getLogger(__name__)


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


def _present_ids(rows_by_table: dict[str, list[dict]]) -> dict[str, set]:
    return {name: {r["id"] for r in rows if "id" in r} for name, rows in rows_by_table.items()}


# The two owner-reference columns: an orphan here is reassigned to the
# `deleted_placeholder_user` sentinel instead of being nulled, since these
# columns are NOT NULL on their tables.
_OWNER_FK_COLUMNS = {"created_by", "uploaded_by"}


def _repair_orphans(rows_by_table: dict[str, list[dict]]) -> dict[str, int]:
    """Fix up dangling FKs left over from SQLite (which never enforced them)
    before the rows are inserted into Postgres, which does. Mutates
    `rows_by_table` in place and returns a per-table count of rows touched
    (nulled, reassigned to the sentinel, or dropped).

    For every FK column (discovered from SQLModel.metadata, not hardcoded):
    a value referencing a parent id absent from the source is nulled if the
    column is nullable, reassigned to the `deleted_placeholder_user` sentinel
    if it is `created_by`/`uploaded_by`, or — for a required, non-owner FK
    with a missing parent (should be rare) — the row is dropped and logged.
    Tables are walked in `sorted_tables` (parent-before-child) order so a
    drop in a parent table is visible to its children in the same pass.

    The sentinel is only materialized the first time an owner-FK orphan is
    actually found (a clean migration must not gain a phantom
    `__deleted_user__` row), and it is synthesized directly into
    `rows_by_table["user"]` with a fresh id rather than written to the
    source: `rows_by_table` was already loaded from the source engine before
    this runs, so the source database itself is never mutated by a repair.
    """
    present_ids = _present_ids(rows_by_table)
    repairs: dict[str, int] = {}
    sentinel_id: int | None = None

    def sentinel() -> int:
        """Lazily resolve the `deleted_placeholder_user` id, creating it (in
        `rows_by_table` only, never in the source) on first use."""
        nonlocal sentinel_id
        if sentinel_id is not None:
            return sentinel_id

        user_rows = rows_by_table.setdefault("user", [])
        for row in user_rows:
            if row.get("username") == models.DELETED_USERNAME:
                sentinel_id = row["id"]
                return sentinel_id

        new_id = max((r["id"] for r in user_rows if "id" in r), default=0) + 1
        user_rows.append({
            "id": new_id,
            "username": models.DELETED_USERNAME,
            "password_hash": "!",
            "role": models.Role.MEMBER,
            "preferred_team_id": None,
            "disabled": True,
            "token_version": 0,
            "created_at": models.utcnow(),
        })
        present_ids.setdefault("user", set()).add(new_id)
        sentinel_id = new_id
        return sentinel_id

    for table in SQLModel.metadata.sorted_tables:
        rows = rows_by_table.get(table.name)
        if not rows:
            continue
        fk_cols = []
        for col in table.columns:
            if not col.foreign_keys:
                continue
            parent_table = next(iter(col.foreign_keys)).column.table.name
            fk_cols.append((col.name, parent_table, col.nullable))
        if not fk_cols:
            continue

        touched = 0
        kept_rows = []
        for row in rows:
            drop = False
            for col_name, parent_table, nullable in fk_cols:
                value = row.get(col_name)
                if value is None or value in present_ids.get(parent_table, ()):
                    continue
                if col_name in _OWNER_FK_COLUMNS:
                    row[col_name] = sentinel()
                elif nullable:
                    row[col_name] = None
                else:
                    drop = True
                    break
                touched += 1
            if drop:
                touched += 1
                logger.warning(
                    "migration: dropping %s row (id=%s) — required FK '%s' has no parent in source",
                    table.name, row.get("id"), col_name,
                )
                continue
            kept_rows.append(row)

        rows_by_table[table.name] = kept_rows
        present_ids[table.name] = {r["id"] for r in kept_rows if "id" in r}
        if touched:
            repairs[table.name] = touched

    return repairs


def migrate(source_engine, target_engine) -> dict[str, int]:
    _require_postgres_target(target_engine)
    _require_empty_target(target_engine)

    with source_engine.connect() as src:
        rows_by_table = {
            table.name: [dict(r._mapping) for r in src.execute(select(table))]
            for table in SQLModel.metadata.sorted_tables
        }

    repairs = _repair_orphans(rows_by_table)
    for table_name, n in repairs.items():
        logger.warning("migration: repaired %d orphaned FK reference(s) in '%s'", n, table_name)

    counts: dict[str, int] = {}
    with target_engine.begin() as dst:
        for table in SQLModel.metadata.sorted_tables:
            rows = rows_by_table[table.name]
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
