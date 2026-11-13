import math

from app.routing.calc import HaversineCalc, haversine_m
from app.models import LegSource


def test_haversine_known_distance():
    # Amsterdam -> Utrecht ~ 35 km great-circle.
    d = haversine_m(52.3676, 4.9041, 52.0907, 5.1214)
    assert 30_000 < d < 45_000


def test_haversine_calc_estimate_source_and_duration():
    leg = HaversineCalc(avg_kmh=70).leg(52.3676, 4.9041, 52.0907, 5.1214)
    assert leg.source == LegSource.ESTIMATE.value
    assert leg.distance_m > 0
    # duration = distance / speed; ~35km at 70km/h ~ 30 min, allow a wide band.
    assert 20 * 60 < leg.duration_s < 45 * 60


def test_haversine_zero_for_same_point():
    assert math.isclose(haversine_m(1.0, 2.0, 1.0, 2.0), 0.0, abs_tol=1e-6)


from datetime import date
from app.routing.service import derive
from app.models import RouteNode, RouteLeg, RouteNodeKind, LegSource


def _node(id, kind, nights=None, pos=0.0):
    return RouteNode(id=id, route_id=1, position=pos, kind=kind, nights=nights,
                     name=f"n{id}", lat=0.0, lng=0.0)


def test_derive_end_date_and_inbound_travel():
    nodes = [
        _node(1, RouteNodeKind.STAY, nights=2, pos=1.0),
        _node(2, RouteNodeKind.STOP, pos=2.0),
        _node(3, RouteNodeKind.STAY, nights=1, pos=3.0),
    ]
    legs = [
        RouteLeg(route_id=1, from_node_id=1, to_node_id=2, distance_m=10000, duration_s=600, source=LegSource.ESTIMATE),
        RouteLeg(route_id=1, from_node_id=2, to_node_id=3, distance_m=5000, duration_s=300, source=LegSource.ESTIMATE),
    ]
    out = derive(nodes, legs, start_date=date(2026, 7, 14))
    assert out["end_date"] == date(2026, 7, 17)          # 14 + (2 + 1) nights
    assert out["totals"]["duration_s"] == 900
    assert out["stays"][1]["arrive_date"] == date(2026, 7, 14)
    assert out["stays"][3]["arrive_date"] == date(2026, 7, 16)  # after 2 nights at stay 1
    # inbound travel to stay 3 = leg(1->2) + leg(2->3)
    assert out["stays"][3]["inbound_duration_s"] == 900
    assert out["stays"][1]["inbound_duration_s"] == 0    # first stay, nothing inbound


def test_concurrent_recompute_no_duplicate_legs(client, monkeypatch):
    """Two overlapping recomputes of one route (e.g. two edits landing while a
    slow Google call is in flight) must leave exactly one leg per node pair."""
    import asyncio
    from collections import defaultdict

    from sqlmodel import Session, select

    from app import db
    from app.models import RouteLeg
    from app.routing import service
    from app.routing.calc import Leg

    client.post("/api/auth/setup", json={"username": "admin", "password": "pw123456"})
    client.patch("/api/settings", json={"routes_enabled": True})
    rid = client.post("/api/routes", json={"name": "T", "start_date": "2026-07-14"}).json()["id"]
    for i in range(4):
        client.post(f"/api/routes/{rid}/nodes",
                    json={"kind": "stop", "name": f"N{i}", "lat": 52.0 + i / 10, "lng": 4.9})

    class SlowGoogle:
        client = None

        async def leg(self, *a):
            await asyncio.sleep(0.05)  # both recomputes are now mid-await
            return Leg(distance_m=1000, duration_s=600, source="google", geometry="ENC")

    monkeypatch.setattr(service, "resolve_calc", lambda settings: (SlowGoogle(), HaversineCalc()))
    # Fresh locks: this test's event loop must not leave a loop-bound lock behind.
    monkeypatch.setattr(service, "_route_locks", defaultdict(asyncio.Lock))

    async def scenario():
        with Session(db.engine) as s1, Session(db.engine) as s2:
            await asyncio.gather(service.recompute_legs(s1, rid), service.recompute_legs(s2, rid))

    asyncio.run(scenario())

    with Session(db.engine) as s:
        legs = s.exec(select(RouteLeg).where(RouteLeg.route_id == rid)).all()
    assert len(legs) == 4 - 1
