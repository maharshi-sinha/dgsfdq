from datetime import date, datetime

from pydantic import BaseModel


class ActualPointSchema(BaseModel):
    start_time: datetime
    settlement_period: int
    generation_mw: int


class ActualsByDateResponse(BaseModel):
    date: date
    points: list[ActualPointSchema]
