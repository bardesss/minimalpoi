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
