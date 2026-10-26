import httpx
import structlog

from app.core.config import settings

logger = structlog.get_logger()


class ElexonClient:
    def __init__(self):
        self.base_url = settings.elexon_base_url
        self.client = httpx.AsyncClient(timeout=60.0)

    async def fetch_wind_actuals(self, from_date: str, to_date: str) -> list[dict]:
        url = f"{self.base_url}/datasets/FUELHH/stream"
        params = {
            "publishDateTimeFrom": f"{from_date}T00:00:00Z",
            "publishDateTimeTo": f"{to_date}T23:59:59Z",
        }
        logger.info("fetching_wind_actuals", url=url, params=params)
        response = await self.client.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        return [r for r in data if r.get("fuelType") == "WIND"]

    async def fetch_wind_forecasts(self, from_date: str, to_date: str) -> list[dict]:
        url = f"{self.base_url}/datasets/WINDFOR/stream"
        params = {
            "publishDateTimeFrom": f"{from_date}T00:00:00Z",
            "publishDateTimeTo": f"{to_date}T23:59:59Z",
        }
        logger.info("fetching_wind_forecasts", url=url, params=params)
        response = await self.client.get(url, params=params)
        response.raise_for_status()
        return response.json()

    async def close(self):
        await self.client.aclose()
