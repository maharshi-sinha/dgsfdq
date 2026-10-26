from collections import defaultdict
from datetime import date, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.repositories.actual_repo import ActualRepository
from app.repositories.forecast_repo import ForecastRepository
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


class AccuracyService:
    def __init__(self, session: AsyncSession):
        self.forecast_repo = ForecastRepository(session)
        self.actual_repo = ActualRepository(session)

    async def _build_pairs(self, from_date: date, to_date: date):
        actuals = await self.actual_repo.get_in_range(from_date, to_date)
        forecasts = await self.forecast_repo.get_forecasts_in_range(from_date, to_date, settings.gate_closure_hour)

        actual_by_hour = {}
        for a in actuals:
            hour_key = a.start_time.replace(minute=0, second=0, microsecond=0)
            if hour_key not in actual_by_hour:
                actual_by_hour[hour_key] = []
            actual_by_hour[hour_key].append(a.generation_mw)

        actual_hourly_avg = {k: sum(v) / len(v) for k, v in actual_by_hour.items()}

        pairs = []
        details = []
        for f in forecasts:
            hour_key = f.start_time.replace(minute=0, second=0, microsecond=0)
            if hour_key in actual_hourly_avg:
                actual_mw = actual_hourly_avg[hour_key]
                error = f.generation_mw - actual_mw
                pairs.append((f.generation_mw, actual_mw))
                details.append({
                    "date": f.start_time.strftime("%Y-%m-%d"),
                    "hour": f.start_time.hour,
                    "forecast_mw": f.generation_mw,
                    "actual_mw": round(actual_mw),
                    "error_mw": round(error),
                })
        return pairs, details

    async def get_summary(self, from_date: date, to_date: date):
        pairs, _ = await self._build_pairs(from_date, to_date)
        return {
            "mae": round(compute_mae(pairs), 1),
            "rmse": round(compute_rmse(pairs), 1),
            "mape": round(compute_mape(pairs), 1),
            "bias": round(compute_bias(pairs), 1),
            "count": len(pairs),
        }

    async def get_daily(self, from_date: date, to_date: date):
        pairs, details = await self._build_pairs(from_date, to_date)
        by_date = defaultdict(list)
        for d in details:
            by_date[d["date"]].append((d["forecast_mw"], d["actual_mw"]))

        result = []
        for dt_str in sorted(by_date.keys()):
            day_pairs = by_date[dt_str]
            result.append({
                "date": dt_str,
                "mae": round(compute_mae(day_pairs), 1),
                "rmse": round(compute_rmse(day_pairs), 1),
                "bias": round(compute_bias(day_pairs), 1),
            })
        return result

    async def get_distribution(self, from_date: date, to_date: date, bin_width: float = 250):
        pairs, details = await self._build_pairs(from_date, to_date)
        errors = [d["error_mw"] for d in details]
        return {
            "bins": compute_distribution(errors, bin_width),
            "percentiles": compute_percentiles(errors),
        }

    async def get_hourly(self, from_date: date, to_date: date):
        _, details = await self._build_pairs(from_date, to_date)
        hour_errors = defaultdict(list)
        for d in details:
            hour_errors[d["hour"]].append(d["error_mw"])
        hourly = compute_hourly_mae(hour_errors)
        return [hourly[h] for h in sorted(hourly.keys())]

    async def get_worst_cases(self, from_date: date, to_date: date, limit: int = 10):
        _, details = await self._build_pairs(from_date, to_date)
        return compute_worst_cases(details, limit)
