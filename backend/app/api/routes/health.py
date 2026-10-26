from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.sync.sync_service import SyncService

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False
    return {"status": "ok" if db_ok else "degraded", "db_connected": db_ok}


@router.post("/sync/trigger")
async def trigger_sync(db: AsyncSession = Depends(get_db)):
    service = SyncService(db)
    try:
        await service.sync_january_2026()
        return {"status": "success"}
    finally:
        await service.close()
