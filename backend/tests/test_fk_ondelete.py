from app import models as m
from app.models import SYNC_USERNAME, DELETED_USERNAME, SYSTEM_USERNAMES, deleted_placeholder_user


def _ondelete(table, col):
    fks = list(table.c[col].foreign_keys)
    assert len(fks) == 1, f"{table.name}.{col} has {len(fks)} FKs"
    return fks[0].ondelete


def test_ondelete_actions_are_set():
    assert _ondelete(m.POI.__table__, "category_id") == "SET NULL"
    assert _ondelete(m.Route.__table__, "team_id") == "SET NULL"
    assert _ondelete(m.RouteNode.__table__, "poi_id") == "SET NULL"
    assert _ondelete(m.RouteNode.__table__, "route_id") == "CASCADE"
    assert _ondelete(m.RouteLeg.__table__, "route_id") == "CASCADE"
    assert _ondelete(m.RouteLeg.__table__, "from_node_id") == "CASCADE"
    assert _ondelete(m.RouteAttachment.__table__, "route_id") == "CASCADE"
    assert _ondelete(m.RouteAttachment.__table__, "node_id") == "SET NULL"
    assert _ondelete(m.RouteShare.__table__, "route_id") == "CASCADE"
    assert _ondelete(m.ApiToken.__table__, "user_id") == "CASCADE"
    assert _ondelete(m.Visit.__table__, "poi_id") == "CASCADE"
    assert _ondelete(m.Visit.__table__, "team_id") == "SET NULL"
    assert _ondelete(m.Comment.__table__, "user_id") == "CASCADE"
    # created_by / uploaded_by intentionally have no ON DELETE (app reassigns)
    assert _ondelete(m.POI.__table__, "created_by") is None
    assert _ondelete(m.RouteAttachment.__table__, "uploaded_by") is None


def test_system_usernames_and_sentinel(data_dir):
    from sqlmodel import Session
    from app import db
    db.reset_engine(); db.init_db()
    assert SYSTEM_USERNAMES == {SYNC_USERNAME, DELETED_USERNAME}
    with Session(db.engine) as s:
        u1 = deleted_placeholder_user(s)
        assert u1.username == DELETED_USERNAME and u1.disabled is True
        u2 = deleted_placeholder_user(s)   # idempotent
        assert u2.id == u1.id
    db.reset_engine()
