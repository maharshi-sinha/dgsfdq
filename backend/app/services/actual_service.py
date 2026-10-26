from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.actual_repo import ActualRepository
from app.schemas.actual import ActualPointSchema, ActualsByDateResponse


class ActualService:
    def __init__(self, session: AsyncSession):
        self.repo = ActualRepository(session)

    async def get_by_date(self, target_date: date) -> ActualsByDateResponse:
        actuals = await self.repo.get_by_date(target_date)
        points = [
            ActualPointSchema(
                start_time=a.start_time,
                settlement_period=a.settlement_period,
                generation_mw=a.generation_mw,
            )
            for a in actuals
        ]
        return ActualsByDateResponse(date=target_date, points=points)

    async def get_latest(self):
        return await self.repo.get_latest()
