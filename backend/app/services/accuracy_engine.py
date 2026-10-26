import math


def compute_mae(pairs: list[tuple[float, float]]) -> float:
    if not pairs:
        return 0.0
    return sum(abs(f - a) for f, a in pairs) / len(pairs)


def compute_rmse(pairs: list[tuple[float, float]]) -> float:
    if not pairs:
        return 0.0
    return math.sqrt(sum((f - a) ** 2 for f, a in pairs) / len(pairs))


def compute_mape(pairs: list[tuple[float, float]]) -> float:
    valid = [(f, a) for f, a in pairs if a != 0]
    if not valid:
        return 0.0
    return sum(abs(f - a) / abs(a) for f, a in valid) / len(valid) * 100


def compute_bias(pairs: list[tuple[float, float]]) -> float:
    if not pairs:
        return 0.0
    return sum(f - a for f, a in pairs) / len(pairs)


def compute_percentiles(errors: list[float]) -> dict[str, float]:
    if not errors:
        return {k: 0.0 for k in ["p5", "p25", "p50", "p75", "p90", "p95"]}
    sorted_errors = sorted(errors)
    n = len(sorted_errors)

    def _pct(p: float) -> float:
        idx = p / 100 * (n - 1)
        lo = int(idx)
        hi = min(lo + 1, n - 1)
        frac = idx - lo
        return sorted_errors[lo] * (1 - frac) + sorted_errors[hi] * frac

    return {
        "p5": round(_pct(5), 1),
        "p25": round(_pct(25), 1),
        "p50": round(_pct(50), 1),
        "p75": round(_pct(75), 1),
        "p90": round(_pct(90), 1),
        "p95": round(_pct(95), 1),
    }


def compute_distribution(errors: list[float], bin_width: float = 250) -> list[dict]:
    if not errors:
        return []
    min_e = math.floor(min(errors) / bin_width) * bin_width
    max_e = math.ceil(max(errors) / bin_width) * bin_width
    bins = []
    lower = min_e
    while lower < max_e:
        upper = lower + bin_width
        count = sum(1 for e in errors if lower <= e < upper)
        bins.append({"lower": lower, "upper": upper, "count": count})
        lower = upper
    leftover = sum(1 for e in errors if e >= max_e)
    if leftover > 0 and bins:
        bins[-1]["count"] += leftover
    return bins


def compute_hourly_mae(hour_errors: dict[int, list[float]]) -> dict[int, dict]:
    result = {}
    for hour in sorted(hour_errors.keys()):
        errors = hour_errors[hour]
        result[hour] = {
            "hour": hour,
            "mae": round(sum(abs(e) for e in errors) / len(errors), 1) if errors else 0.0,
            "count": len(errors),
        }
    return result


def compute_worst_cases(cases: list[dict], limit: int = 10) -> list[dict]:
    sorted_cases = sorted(cases, key=lambda c: abs(c["error_mw"]), reverse=True)
    for case in sorted_cases:
        case["direction"] = "over" if case["error_mw"] > 0 else "under"
    return sorted_cases[:limit]
