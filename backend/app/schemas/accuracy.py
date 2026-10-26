from datetime import date

from pydantic import BaseModel


class AccuracySummaryResponse(BaseModel):
    mae: float
    rmse: float
    mape: float
    bias: float
    count: int


class DailyAccuracyPoint(BaseModel):
    date: date
    mae: float
    rmse: float
    bias: float


class DistributionBin(BaseModel):
    lower: float
    upper: float
    count: int


class Percentiles(BaseModel):
    p5: float
    p25: float
    p50: float
    p75: float
    p90: float
    p95: float


class DistributionResponse(BaseModel):
    bins: list[DistributionBin]
    percentiles: Percentiles


class HourlyAccuracyPoint(BaseModel):
    hour: int
    mae: float
    count: int


class WorstCasePoint(BaseModel):
    date: date
    hour: int
    forecast_mw: int
    actual_mw: int
    error_mw: int
    direction: str
