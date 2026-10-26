from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.actual import ActualsByDateResponse
from app.services.actual_service import ActualService

router = APIRouter(prefix="/api/actuals", tags=["actuals"])


@router.get("/by-date", response_model=ActualsByDateResponse)
async def get_actuals_by_date(
    date: date,
    db: AsyncSession = Depends(get_db),
):
    service = ActualService(db)
    return await service.get_by_date(date)
