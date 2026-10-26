from datetime import date, datetime

from pydantic import BaseModel


class ForecastPointSchema(BaseModel):
    start_time: datetime
    generation_mw: int


class ForecastAtGateResponse(BaseModel):
    publish_time: datetime
    delivery_date: date
    points: list[ForecastPointSchema]


class ForecastRunSummary(BaseModel):
    publish_time: datetime
    point_count: int


class ForecastsByDateResponse(BaseModel):
    delivery_date: date
    runs: list[ForecastRunSummary]
    points: list[ForecastPointSchema]
