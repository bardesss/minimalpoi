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
