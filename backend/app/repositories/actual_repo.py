from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.wind_actual import WindActual


class ActualRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_date(self, target_date: date) -> list[WindActual]:
        stmt = (
            select(WindActual)
            .where(WindActual.settlement_date == target_date)
            .order_by(WindActual.start_time)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_in_range(self, from_date: date, to_date: date) -> list[WindActual]:
        stmt = (
            select(WindActual)
            .where(
                WindActual.settlement_date >= from_date,
                WindActual.settlement_date <= to_date,
            )
            .order_by(WindActual.start_time)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_latest(self) -> WindActual | None:
        stmt = select(WindActual).order_by(WindActual.start_time.desc()).limit(1)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
