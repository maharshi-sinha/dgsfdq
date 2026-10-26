from datetime import datetime

from sqlalchemy import BigInteger, Index, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class WindForecast(Base):
    __tablename__ = "wind_forecasts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    start_time: Mapped[datetime] = mapped_column(nullable=False)
    generation_mw: Mapped[int] = mapped_column(Integer, nullable=False)
    publish_time: Mapped[datetime] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("start_time", "publish_time", name="uq_wind_forecasts_start_publish"),
        Index("ix_wind_forecasts_publish_time", "publish_time"),
        Index("ix_wind_forecasts_start_time", "start_time"),
    )
