from sqlmodel import Session, select

from app import db
from app.models import Role, User


def test_init_db_creates_tables_and_user_roundtrip(data_dir):
    db.reset_engine()
    db.init_db()
    with Session(db.engine) as session:
        session.add(User(username="alice", password_hash="x", role=Role.ADMIN))
        session.commit()
    with Session(db.engine) as session:
        user = session.exec(select(User).where(User.username == "alice")).one()
        assert user.id is not None
        assert user.role == Role.ADMIN
        assert user.disabled is False
        assert user.created_at is not None
