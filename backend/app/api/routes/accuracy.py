from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.services.accuracy_service import AccuracyService

router = APIRouter(prefix="/api/accuracy", tags=["accuracy"])

DEFAULT_FROM = date(2026, 1, 1)
DEFAULT_TO = date(2026, 1, 31)


@router.get("/summary")
async def get_summary(
    from_date: date = Query(default=DEFAULT_FROM),
    to_date: date = Query(default=DEFAULT_TO),
    db: AsyncSession = Depends(get_db),
):
    service = AccuracyService(db)
    return await service.get_summary(from_date, to_date)


@router.get("/daily")
async def get_daily(
    from_date: date = Query(default=DEFAULT_FROM),
    to_date: date = Query(default=DEFAULT_TO),
    db: AsyncSession = Depends(get_db),
):
    service = AccuracyService(db)
    return await service.get_daily(from_date, to_date)


@router.get("/distribution")
async def get_distribution(
    from_date: date = Query(default=DEFAULT_FROM),
    to_date: date = Query(default=DEFAULT_TO),
    bin_width_mw: float = Query(default=250),
    db: AsyncSession = Depends(get_db),
):
    service = AccuracyService(db)
    return await service.get_distribution(from_date, to_date, bin_width_mw)


@router.get("/hourly")
async def get_hourly(
    from_date: date = Query(default=DEFAULT_FROM),
    to_date: date = Query(default=DEFAULT_TO),
    db: AsyncSession = Depends(get_db),
):
    service = AccuracyService(db)
    return await service.get_hourly(from_date, to_date)


@router.get("/worst-cases")
async def get_worst_cases(
    from_date: date = Query(default=DEFAULT_FROM),
    to_date: date = Query(default=DEFAULT_TO),
    limit: int = Query(default=10),
    db: AsyncSession = Depends(get_db),
):
    service = AccuracyService(db)
    return await service.get_worst_cases(from_date, to_date, limit)
