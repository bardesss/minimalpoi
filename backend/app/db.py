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


def _add_missing_columns(engine) -> None:
    """Additively backfill nullable columns added to models after a table was
    first created.

    There is no migrations framework: `create_all` adds new *tables* but never
    new *columns* on an existing table, so a model field added in a later
    release (e.g. Settings.trip_last_sync_at) would otherwise make every read of
    that table fail with "no such column" on a pre-existing database. For each
    table that already exists, add any model column missing from it. Only
    **nullable** columns are added (a NOT NULL column needs a real migration);
    each addition is isolated so one failure never blocks startup.
    """
    inspector = inspect(engine)
    existing = set(inspector.get_table_names())
    for table in SQLModel.metadata.sorted_tables:
        if table.name not in existing:
            continue  # brand-new table — create_all already made it in full
        have = {c["name"] for c in inspector.get_columns(table.name)}
        for col in table.columns:
            if col.name in have or not col.nullable:
                continue
            ddl = CreateColumn(col).compile(dialect=engine.dialect)
            try:
                with engine.begin() as conn:
                    conn.execute(text(f'ALTER TABLE "{table.name}" ADD COLUMN {ddl}'))
                logger.info("Added missing column %s.%s", table.name, col.name)
            except Exception as exc:  # pragma: no cover - defensive
                logger.warning("Could not add column %s.%s: %s", table.name, col.name, exc)


def init_db() -> None:
    if engine is None:
        reset_engine()
    SQLModel.metadata.create_all(engine)
    _add_missing_columns(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
