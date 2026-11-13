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
    # Naive datetimes are stored as UTC; pin the session zone so a server set to
    # another timezone cannot shift them.
    return url, {"options": "-c timezone=utc"}


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


def _dedupe_route_roles(engine) -> None:
    """One-off, idempotent: before the unique (route_id, role) index exists, a
    route may hold several start (or end) nodes. Keep the lowest-id one per role
    and clear `role` on the extras so the index can be created."""
    if "routenode" not in inspect(engine).get_table_names():
        return
    with engine.begin() as conn:
        result = conn.execute(text(
            "UPDATE routenode SET role = NULL WHERE role IS NOT NULL AND id NOT IN "
            "(SELECT MIN(id) FROM routenode WHERE role IS NOT NULL GROUP BY route_id, role)"))
        if result.rowcount:
            logger.info("Cleared role on %d duplicate start/end node(s)", result.rowcount)


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


def _lowercase_usernames(engine) -> None:
    """One-off, idempotent: usernames are matched case-insensitively, so store
    them lower-cased. Users whose lower-cased name would collide with another
    account are left unchanged (and logged) rather than merged or renamed.
    System accounts are skipped."""
    from sqlmodel import Session, select

    from .models import SYSTEM_USERNAMES, User

    # The table may not exist yet if create_all ran before the models were
    # imported (init_db is called again once the app has loaded them).
    if not inspect(engine).has_table(User.__tablename__):
        return
    with Session(engine) as session:
        users = session.exec(select(User)).all()
        taken = {u.username for u in users}
        changed = False
        for user in users:
            lowered = user.username.strip().lower()
            if user.username in SYSTEM_USERNAMES or lowered == user.username:
                continue
            if lowered in taken or any(
                o is not user and o.username.strip().lower() == lowered for o in users
            ):
                logger.warning("Username %r collides with another account after lower-casing; left unchanged",
                               user.username)
                continue
            taken.discard(user.username)
            taken.add(lowered)
            user.username = lowered
            session.add(user)
            changed = True
        if changed:
            session.commit()


def _repair_dangling_refs(engine) -> None:
    """One-off, idempotent: null references left pointing at deleted POIs/teams
    (SQLite runs with foreign keys off, and reuses rowids, so a stale id would
    silently attach to a brand-new row)."""
    from sqlalchemy import text

    insp = inspect(engine)
    stmts = (
        ("routenode", "poi_id", "poi"),
        ("visit", "team_id", "team"),
        ("user", "preferred_team_id", "team"),
    )
    with engine.begin() as conn:
        for table, col, target in stmts:
            if not (insp.has_table(table) and insp.has_table(target)):
                continue
            if col not in {c["name"] for c in insp.get_columns(table)}:
                continue
            conn.execute(text(
                f'UPDATE "{table}" SET {col} = NULL '
                f'WHERE {col} IS NOT NULL AND {col} NOT IN (SELECT id FROM "{target}")'
            ))


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


def reset_pg_sequences(engine) -> None:
    """After inserting explicit ids, advance each single-integer-PK sequence past
    MAX(id) so the next ORM insert doesn't collide. Postgres-only (a no-op on
    SQLite, whose rowid allocation already follows MAX(id)); composite or
    non-integer PKs (e.g. teammember) are skipped."""
    if engine.dialect.name != "postgresql":
        return
    with engine.begin() as conn:
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


def init_db() -> None:
    if engine is None:
        reset_engine()
    SQLModel.metadata.create_all(engine)
    _add_missing_columns(engine)
    _dedupe_route_roles(engine)
    _add_missing_indexes(engine)
    _drop_removed_trip_columns(engine)
    _lowercase_usernames(engine)
    _repair_dangling_refs(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
