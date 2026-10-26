from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.wind_forecast import WindForecast


class ForecastRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_latest_run_before(self, delivery_date: date, before_time: datetime) -> datetime | None:
        start_of_day = datetime(delivery_date.year, delivery_date.month, delivery_date.day)
        end_of_day = datetime(delivery_date.year, delivery_date.month, delivery_date.day, 23, 59, 59)

        stmt = (
            select(WindForecast.publish_time)
            .where(
                WindForecast.start_time >= start_of_day,
                WindForecast.start_time <= end_of_day,
                WindForecast.publish_time < before_time,
            )
            .order_by(WindForecast.publish_time.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        val = result.scalar_one_or_none()
        if val is not None and val.tzinfo is not None:
            val = val.replace(tzinfo=None)
        return val

    async def get_forecasts_by_run(self, delivery_date: date, publish_time: datetime) -> list[WindForecast]:
        start_of_day = datetime(delivery_date.year, delivery_date.month, delivery_date.day)
        end_of_day = datetime(delivery_date.year, delivery_date.month, delivery_date.day, 23, 59, 59)

        stmt = (
            select(WindForecast)
            .where(
                WindForecast.start_time >= start_of_day,
                WindForecast.start_time <= end_of_day,
                WindForecast.publish_time == publish_time,
            )
            .order_by(WindForecast.start_time)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_all_runs_for_date(self, delivery_date: date) -> list[WindForecast]:
        start_of_day = datetime(delivery_date.year, delivery_date.month, delivery_date.day)
        end_of_day = datetime(delivery_date.year, delivery_date.month, delivery_date.day, 23, 59, 59)

        stmt = (
            select(WindForecast)
            .where(
                WindForecast.start_time >= start_of_day,
                WindForecast.start_time <= end_of_day,
            )
            .order_by(WindForecast.publish_time.desc(), WindForecast.start_time)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_forecasts_in_range(self, from_date: date, to_date: date, gate_hour: int) -> list[WindForecast]:
        from sqlalchemy import func, and_

        from_dt = datetime(from_date.year, from_date.month, from_date.day)
        to_dt = datetime(to_date.year, to_date.month, to_date.day, 23, 59, 59)

        latest_run_subq = (
            select(
                func.date(WindForecast.start_time).label("delivery_date"),
                func.max(WindForecast.publish_time).label("max_publish"),
            )
            .where(
                WindForecast.start_time >= from_dt,
                WindForecast.start_time <= to_dt,
            )
            .group_by(func.date(WindForecast.start_time))
            .subquery()
        )

        stmt = (
            select(WindForecast)
            .join(
                latest_run_subq,
                and_(
                    func.date(WindForecast.start_time) == latest_run_subq.c.delivery_date,
                    WindForecast.publish_time == latest_run_subq.c.max_publish,
                ),
            )
            .order_by(WindForecast.start_time)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
