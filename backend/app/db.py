from collections.abc import Iterator

from sqlmodel import Session, SQLModel, create_engine

from .config import get_data_dir

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


def init_db() -> None:
    if engine is None:
        reset_engine()
    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
