import logging
from collections.abc import Iterator

from sqlalchemy import inspect, text
from sqlalchemy.schema import CreateColumn
from sqlmodel import Session, SQLModel, create_engine

from .config import get_data_dir

logger = logging.getLogger(__name__)

engine = None


def reset_engine() -> None:
    """(Re)build the engine against the current data dir. Used by tests."""
    global engine
    if engine is not None:
        engine.dispose()
    db_path = get_data_dir() / "minimalpoi.db"
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )


def _scalar_default_sql(col) -> str | None:
    """An SQL literal for a column's Python-side scalar default, or None.

    SQLite can't add a NOT NULL column to a populated table without a DEFAULT, so
    we synthesize one from the model field's default (e.g. token_version=0)."""
    default = col.default
    if default is None or not getattr(default, "is_scalar", False):
        return None
    value = default.arg
    if isinstance(value, bool):
        return "1" if value else "0"
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
                default_sql = _scalar_default_sql(col)
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
    _purge_orphan_route_attachments()


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
