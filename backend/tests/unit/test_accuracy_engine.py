import math

from app.services.accuracy_engine import (
    compute_bias,
    compute_distribution,
    compute_hourly_mae,
    compute_mae,
    compute_mape,
    compute_percentiles,
    compute_rmse,
    compute_worst_cases,
)


def _make_pairs(errors: list[float]) -> list[tuple[float, float]]:
    """Create (forecast, actual) pairs from a list of errors (forecast - actual)."""
    return [(100 + e, 100) for e in errors]


def test_compute_mae_simple():
    pairs = _make_pairs([10, -20, 30, -40])
    assert compute_mae(pairs) == 25.0


def test_compute_mae_empty():
    assert compute_mae([]) == 0.0


def test_compute_rmse_simple():
    pairs = _make_pairs([10, -20, 30, -40])
    expected = math.sqrt((100 + 400 + 900 + 1600) / 4)
    assert abs(compute_rmse(pairs) - expected) < 0.01


def test_compute_mape_simple():
    pairs = [(110, 100), (90, 100), (120, 100)]
    expected = (10 / 100 + 10 / 100 + 20 / 100) / 3 * 100
    assert abs(compute_mape(pairs) - expected) < 0.01


def test_compute_mape_skips_zero_actuals():
    pairs = [(110, 100), (50, 0)]
    result = compute_mape(pairs)
    assert result == 10.0


def test_compute_bias_positive_means_overforecast():
    pairs = [(120, 100), (130, 100)]
    assert compute_bias(pairs) == 25.0


def test_compute_bias_negative_means_underforecast():
    pairs = [(80, 100), (70, 100)]
    assert compute_bias(pairs) == -25.0


def test_compute_percentiles():
    errors = list(range(-50, 51))
    p = compute_percentiles(errors)
    assert p["p50"] == 0.0
    assert p["p5"] < p["p25"] < p["p50"] < p["p75"] < p["p95"]


def test_compute_distribution():
    errors = [-300, -100, 0, 50, 100, 200, 400]
    bins = compute_distribution(errors, bin_width=250)
    total = sum(b["count"] for b in bins)
    assert total == len(errors)


def test_compute_hourly_mae():
    hour_errors = {0: [10, -20], 12: [30, -40, 50]}
    result = compute_hourly_mae(hour_errors)
    assert result[0]["hour"] == 0
    assert result[0]["mae"] == 15.0
    assert result[0]["count"] == 2
    assert result[12]["mae"] == 40.0


def test_compute_worst_cases():
    cases = [
        {"date": "2026-01-01", "hour": 9, "forecast_mw": 8000, "actual_mw": 11000, "error_mw": -3000},
        {"date": "2026-01-01", "hour": 10, "forecast_mw": 12000, "actual_mw": 11500, "error_mw": 500},
        {"date": "2026-01-02", "hour": 14, "forecast_mw": 15000, "actual_mw": 13000, "error_mw": 2000},
    ]
    worst = compute_worst_cases(cases, limit=2)
    assert len(worst) == 2
    assert abs(worst[0]["error_mw"]) >= abs(worst[1]["error_mw"])
    assert worst[0]["direction"] == "under"
