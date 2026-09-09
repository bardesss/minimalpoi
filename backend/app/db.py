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


# Schema left behind by the removed TRIP sync feature. Dropped once, on the
# first start after upgrading; a second run finds nothing to do.
_REMOVED_SYNC_USERNAME = "__trip_sync__"
_REMOVED_TRIP_COLUMNS = {
    "poi": ("trip_place_id", "trip_sync_status", "trip_synced_snapshot",
            "trip_synced_at", "trip_last_error"),
    "category": ("trip_category_id", "trip_sync_status", "trip_synced_snapshot",
                 "trip_synced_at", "trip_last_error"),
    "settings": ("trip_base_url", "trip_username", "trip_password_enc", "trip_sync_enabled",
                 "trip_sync_interval_seconds", "trip_conflict_policy", "trip_last_sync_at"),
}


def _retire_sync_account(engine) -> None:
    """Hand anything the old TRIP sync account created to the deleted-user
    placeholder, then delete the account. Reassignment must come first, or
    Postgres rejects the delete on the created_by foreign key.

    Mirrors `delete_user` in routers/users.py: the six owned tables get
    reassigned, and the four tables SQLModel declares with
    `ondelete="CASCADE"` (ApiToken, Visit, Comment, TeamMember) get deleted
    explicitly rather than left for the database to cascade. Postgres would
    cascade them on its own, but this app never turns on
    `PRAGMA foreign_keys=ON` for SQLite, so relying on the cascade there
    would leave orphaned rows with a dangling user_id behind."""
    from sqlmodel import Session, select

    from .models import (POI, ApiToken, Category, Comment, Route, RouteAttachment,
                         RouteShare, Team, TeamMember, User, Visit,
                         deleted_placeholder_user)

    with Session(engine) as session:
        ghost = session.exec(select(User).where(User.username == _REMOVED_SYNC_USERNAME)).first()
        if ghost is None:
            return
        placeholder = deleted_placeholder_user(session)
        owned = ((POI, "created_by"), (Category, "created_by"), (Team, "created_by"),
                 (Route, "created_by"), (RouteShare, "created_by"),
                 (RouteAttachment, "uploaded_by"))
        for model, field in owned:
            for row in session.exec(select(model).where(getattr(model, field) == ghost.id)).all():
                setattr(row, field, placeholder.id)
                session.add(row)

        for row in session.exec(select(ApiToken).where(ApiToken.user_id == ghost.id)).all():
            session.delete(row)
        for model in (Visit, Comment):
            for row in session.exec(select(model).where(model.user_id == ghost.id)).all():
                session.delete(row)
        for row in session.exec(select(TeamMember).where(TeamMember.user_id == ghost.id)).all():
            session.delete(row)

        session.delete(ghost)
        session.commit()
        logger.info("Retired the %s account left by TRIP sync", _REMOVED_SYNC_USERNAME)


def _drop_removed_trip_columns(engine) -> None:
    """One-time, idempotent purge of the TRIP sync schema.

    There is no migrations framework, and `create_all` never *removes* anything,
    so columns and tables belonging to a deleted feature would linger forever.
    Nothing reads them, so every step here is best-effort: a failure is logged
    rather than blocking startup. That is genuinely harmless for the retired
    account and the tombstone table, but NOT for the column drops below: five
    of the removed columns (poi.trip_sync_status, category.trip_sync_status,
    settings.trip_sync_enabled, settings.trip_sync_interval_seconds,
    settings.trip_conflict_policy) are NOT NULL with no server default, so on
    a SQLite older than 3.35 (which lacks ALTER TABLE ... DROP COLUMN) the
    leftover column survives and every subsequent INSERT into that table
    fails.
    """
    inspector = inspect(engine)
    existing = set(inspector.get_table_names())

    if "user" in existing:
        try:
            _retire_sync_account(engine)
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Could not retire the TRIP sync account: %s", exc)

    if "tombstone" in existing:
        try:
            with engine.begin() as conn:
                conn.execute(text('DROP TABLE "tombstone"'))
            logger.info("Dropped the tombstone table left by TRIP sync")
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Could not drop the tombstone table: %s", exc)

    for table, columns in _REMOVED_TRIP_COLUMNS.items():
        if table not in existing:
            continue
        have = {c["name"] for c in inspector.get_columns(table)}
        for column in columns:
            if column not in have:
                continue
            try:
                with engine.begin() as conn:
                    conn.execute(text(f'ALTER TABLE "{table}" DROP COLUMN "{column}"'))
                logger.info("Dropped removed column %s.%s", table, column)
            except Exception as exc:  # pragma: no cover - defensive
                logger.error(
                    "Could not drop column %s.%s: %s. This column is NOT NULL with no "
                    "default, so inserts into %s will now fail. SQLite 3.35 or newer "
                    "is required to drop columns.",
                    table, column, exc, table,
                )

    # Last, and Postgres-only: SQLModel mapped the old SyncStatus enum to a
    # native `syncstatus` type, which DROP COLUMN leaves behind. It can only go
    # once no column uses it, hence after the loop above. SQLite has no native
    # enum types, so there is nothing to drop there. A leftover type really is
    # harmless — it would only collide if an identically named enum were ever
    # reintroduced — so this one warns rather than errors on failure.
    if engine.dialect.name == "postgresql":
        try:
            with engine.begin() as conn:
                found = conn.execute(
                    text("SELECT 1 FROM pg_type WHERE typname = 'syncstatus'")
                ).first()
                conn.execute(text("DROP TYPE IF EXISTS syncstatus"))
            if found is not None:
                logger.info("Dropped the syncstatus enum type left by TRIP sync")
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Could not drop the syncstatus enum type: %s", exc)


def init_db() -> None:
    if engine is None:
        reset_engine()
    SQLModel.metadata.create_all(engine)
    _add_missing_columns(engine)
    _add_missing_indexes(engine)
    _drop_removed_trip_columns(engine)
    _purge_orphan_route_attachments()


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
