from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.forecast import ForecastAtGateResponse
from app.services.forecast_service import ForecastService

router = APIRouter(prefix="/api/forecasts", tags=["forecasts"])


@router.get("/latest-at-gate", response_model=ForecastAtGateResponse)
async def get_latest_at_gate(
    delivery_date: date,
    db: AsyncSession = Depends(get_db),
):
    service = ForecastService(db)
    result = await service.get_latest_at_gate(delivery_date)
    if result is None:
        raise HTTPException(status_code=404, detail="No forecast found before gate closure for this date")
    return result
