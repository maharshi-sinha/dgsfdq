from datetime import date, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.repositories.forecast_repo import ForecastRepository
from app.schemas.forecast import ForecastAtGateResponse, ForecastPointSchema


class ForecastService:
    def __init__(self, session: AsyncSession):
        self.repo = ForecastRepository(session)

    async def get_latest_at_gate(self, delivery_date: date) -> ForecastAtGateResponse | None:
        gate_day = delivery_date - timedelta(days=1)
        gate_time = datetime(gate_day.year, gate_day.month, gate_day.day, settings.gate_closure_hour)

        latest_publish = await self.repo.get_latest_run_before(delivery_date, gate_time)
        if latest_publish is None:
            return None

        forecasts = await self.repo.get_forecasts_by_run(delivery_date, latest_publish)
        points = [
            ForecastPointSchema(start_time=f.start_time, generation_mw=f.generation_mw)
            for f in forecasts
        ]
        return ForecastAtGateResponse(
            publish_time=latest_publish,
            delivery_date=delivery_date,
            points=points,
        )

    async def get_by_date(self, delivery_date: date):
        return await self.repo.get_all_runs_for_date(delivery_date)
