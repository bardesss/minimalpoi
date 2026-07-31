import logging
import os
from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import inspect, text
from sqlalchemy.schema import CreateColumn
from sqlmodel import Session, SQLModel, create_engine

from .config import get_data_dir

logger = logging.getLogger(__name__)

engine = None


def _normalize_db_url(url: str) -> str:
    """Rewrite driverless Postgres URLs (as handed out by Supabase/Neon/RDS/
    Heroku) to use psycopg3 explicitly, so SQLAlchemy doesn't reach for the
    uninstalled psycopg2. Non-Postgres and already-suffixed URLs pass through."""
    for prefix in ("postgresql://", "postgres://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


def _engine_config(database_url: str | None, data_dir: Path) -> tuple[str, dict]:
    """Resolve the SQLAlchemy URL and connect_args. Unset DATABASE_URL keeps the
    historical SQLite behavior exactly; check_same_thread is SQLite-only."""
    if not database_url:
        return f"sqlite:///{data_dir / 'minimalpoi.db'}", {"check_same_thread": False}
    url = _normalize_db_url(database_url)
    if url.startswith("sqlite"):
        return url, {"check_same_thread": False}
    return url, {}


def reset_engine() -> None:
    """(Re)build the engine from DATABASE_URL (or the default SQLite path). Used by tests."""
    global engine
    if engine is not None:
        engine.dispose()
    url, connect_args = _engine_config(os.environ.get("DATABASE_URL"), get_data_dir())
    engine = create_engine(url, connect_args=connect_args)


def _scalar_default_sql(col, dialect_name: str) -> str | None:
    """An SQL literal for a column's Python-side scalar default, or None.

    Booleans differ by dialect: SQLite stores 1/0, Postgres needs TRUE/FALSE on a
    real BOOLEAN column."""
    default = col.default
    if default is None or not getattr(default, "is_scalar", False):
        return None
    value = default.arg
    if isinstance(value, bool):
        if dialect_name == "sqlite":
            return "1" if value else "0"
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, str):
        return "'" + value.replace("'", "''") + "'"
    return None


def _add_missing_columns(engine) -> None:
    """Additively backfill columns added to models after a table was first
    created.

    There is no migrations framework: `create_all` adds new *tables* but never
    new *columns* on an existing table, so a model field added in a later release
    would otherwise make every read of that table fail with "no such column" on a
    pre-existing database. For each existing table, add any missing model column.
    Nullable columns are added as-is; a NOT NULL column is added with a DEFAULT
    derived from its model default (required by SQLite on a populated table). A
    NOT NULL column with no derivable default is escalated loudly rather than
    silently skipped, so a real migration need can't go unnoticed.
    """
    inspector = inspect(engine)
    existing = set(inspector.get_table_names())
    for table in SQLModel.metadata.sorted_tables:
        if table.name not in existing:
            continue  # brand-new table — create_all already made it in full
        have = {c["name"] for c in inspector.get_columns(table.name)}
        for col in table.columns:
            if col.name in have:
                continue
            if col.nullable:
                ddl = CreateColumn(col).compile(dialect=engine.dialect)
                clause = f"ADD COLUMN {ddl}"
            else:
                default_sql = _scalar_default_sql(col, engine.dialect.name)
                if default_sql is None:
                    logger.error(
                        "Cannot add NOT NULL column %s.%s without a default — a manual "
                        "migration is required.", table.name, col.name,
                    )
                    continue
                type_sql = col.type.compile(dialect=engine.dialect)
                clause = f'ADD COLUMN "{col.name}" {type_sql} NOT NULL DEFAULT {default_sql}'
            try:
                with engine.begin() as conn:
                    conn.execute(text(f'ALTER TABLE "{table.name}" {clause}'))
                logger.info("Added missing column %s.%s", table.name, col.name)
            except Exception as exc:  # pragma: no cover - defensive
                logger.warning("Could not add column %s.%s: %s", table.name, col.name, exc)


def _add_missing_indexes(engine) -> None:
    """Additively backfill indexes declared on a model after its table already
    existed.

    The same gap as `_add_missing_columns`, one level down: `create_all` emits a
    table's indexes only when it creates that table, so an index added to an
    existing model in a later release never appears on a pre-existing database.
    Nothing breaks — the query the index was meant to speed up just keeps doing a
    full scan forever, which is easy to miss precisely because it is silent.

    Runs after `_add_missing_columns` so an index on a newly-backfilled column
    has its column to point at. `checkfirst` keeps it a no-op once present.
    """
    inspector = inspect(engine)
    existing = set(inspector.get_table_names())
    for table in SQLModel.metadata.sorted_tables:
        if table.name not in existing:
            continue  # brand-new table — create_all already made it with its indexes
        have = {ix["name"] for ix in inspector.get_indexes(table.name)}
        for index in table.indexes:
            if index.name in have:
                continue
            try:
                index.create(bind=engine, checkfirst=True)
                logger.info("Created missing index %s on %s", index.name, table.name)
            except Exception as exc:  # pragma: no cover - defensive
                logger.warning("Could not create index %s on %s: %s", index.name, table.name, exc)


def _purge_orphan_route_attachments() -> None:
    """Route-level attachments (node_id NULL) are unreachable now that documents
    attach to a stop or stay. Delete any leftovers — rows and their files — once.
    Idempotent: a no-op after the first run leaves nothing to purge."""
    from sqlmodel import Session, select

    from . import attachments as att
    from .models import RouteAttachment

    # The table may not exist yet if create_all ran before the models were
    # imported (e.g. in a fresh test process); nothing to purge in that case.
    if "routeattachment" not in inspect(engine).get_table_names():
        return

    with Session(engine) as session:
        orphans = session.exec(
            select(RouteAttachment).where(RouteAttachment.node_id.is_(None))
        ).all()
        if not orphans:
            return
        for a in orphans:
            att.remove(a.stored_filename)
            session.delete(a)
        session.commit()
        logger.info("Purged %d orphaned route-level attachment(s)", len(orphans))


def init_db() -> None:
    if engine is None:
        reset_engine()
    SQLModel.metadata.create_all(engine)
    _add_missing_columns(engine)
    _add_missing_indexes(engine)
    _purge_orphan_route_attachments()


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
