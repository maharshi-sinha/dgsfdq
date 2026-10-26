from datetime import datetime

import structlog
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sync_log import SyncLog
from app.models.wind_actual import WindActual
from app.models.wind_forecast import WindForecast
from app.sync.elexon_client import ElexonClient

logger = structlog.get_logger()


class SyncService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.client = ElexonClient()

    async def sync_january_2026(self):
        await self._sync_actuals("2026-01-01", "2026-01-31")
        await self._sync_forecasts("2026-01-01", "2026-01-31")

    async def _sync_actuals(self, from_date: str, to_date: str):
        log_entry = SyncLog(dataset="FUELHH", started_at=datetime.utcnow(), status="running")
        self.session.add(log_entry)
        await self.session.flush()

        try:
            records = await self.client.fetch_wind_actuals(from_date, to_date)
            log_entry.records_fetched = len(records)

            upserted = 0
            for r in records:
                stmt = insert(WindActual).values(
                    start_time=r["startTime"],
                    settlement_date=r["settlementDate"],
                    settlement_period=r["settlementPeriod"],
                    generation_mw=r["generation"],
                    publish_time=r["publishTime"],
                ).on_conflict_do_update(
                    constraint="uq_wind_actuals_start_time",
                    set_={"generation_mw": r["generation"], "publish_time": r["publishTime"]},
                )
                await self.session.execute(stmt)
                upserted += 1

            log_entry.records_upserted = upserted
            log_entry.status = "success"
            log_entry.completed_at = datetime.utcnow()
            await self.session.commit()
            logger.info("sync_actuals_complete", fetched=len(records), upserted=upserted)

        except Exception as e:
            log_entry.status = "failed"
            log_entry.error_message = str(e)
            log_entry.completed_at = datetime.utcnow()
            await self.session.commit()
            logger.error("sync_actuals_failed", error=str(e))
            raise

    async def _sync_forecasts(self, from_date: str, to_date: str):
        log_entry = SyncLog(dataset="WINDFOR", started_at=datetime.utcnow(), status="running")
        self.session.add(log_entry)
        await self.session.flush()

        try:
            records = await self.client.fetch_wind_forecasts(from_date, to_date)
            log_entry.records_fetched = len(records)

            upserted = 0
            for r in records:
                stmt = insert(WindForecast).values(
                    start_time=r["startTime"],
                    generation_mw=r["generation"],
                    publish_time=r["publishTime"],
                ).on_conflict_do_update(
                    constraint="uq_wind_forecasts_start_publish",
                    set_={"generation_mw": r["generation"]},
                )
                await self.session.execute(stmt)
                upserted += 1

            log_entry.records_upserted = upserted
            log_entry.status = "success"
            log_entry.completed_at = datetime.utcnow()
            await self.session.commit()
            logger.info("sync_forecasts_complete", fetched=len(records), upserted=upserted)

        except Exception as e:
            log_entry.status = "failed"
            log_entry.error_message = str(e)
            log_entry.completed_at = datetime.utcnow()
            await self.session.commit()
            logger.error("sync_forecasts_failed", error=str(e))
            raise

    async def close(self):
        await self.client.close()
