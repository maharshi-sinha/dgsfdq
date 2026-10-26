from datetime import date, datetime

from sqlalchemy import BigInteger, Date, Index, Integer, SmallInteger, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class WindActual(Base):
    __tablename__ = "wind_actuals"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    start_time: Mapped[datetime] = mapped_column(nullable=False)
    settlement_date: Mapped[date] = mapped_column(Date, nullable=False)
    settlement_period: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    generation_mw: Mapped[int] = mapped_column(Integer, nullable=False)
    publish_time: Mapped[datetime] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("start_time", name="uq_wind_actuals_start_time"),
        Index("ix_wind_actuals_settlement_date", "settlement_date"),
    )
