# WindView Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React + FastAPI web app that shows UK wind generation forecasts vs actuals from Elexon BMRS, with full error analysis, for a utility procurement team making day-ahead market decisions in January 2026.

**Architecture:** Python FastAPI backend with layered architecture (routes → services → repositories → PostgreSQL). React frontend with clean separation (data layer → domain hooks → presentation components). Docker Compose orchestrates all three services.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 (async), asyncpg, PostgreSQL 16, httpx, React 18, TypeScript, Vite, TanStack Query v5, Recharts, Lucide React, Tailwind CSS, Zustand, Docker Compose.

---

## Task 1: Project scaffolding and Docker Compose

**Files:**
- Create: `docker-compose.yml`
- Create: `backend/pyproject.toml`
- Create: `backend/Dockerfile`
- Create: `backend/.env.example`
- Create: `frontend/package.json` (via Vite scaffold)
- Create: `frontend/Dockerfile`
- Create: `.gitignore`

- [ ] **Step 1: Create root `.gitignore`**

```gitignore
# Python
__pycache__/
*.pyc
.venv/
*.egg-info/
.pytest_cache/

# Node
node_modules/
dist/
.env
.env.local

# IDE
.idea/
.vscode/
*.swp

# Docker
postgres_data/

# OS
.DS_Store
```

- [ ] **Step 2: Initialize git repo**

Run:
```bash
git init
git add .gitignore
git commit -m "chore: initial gitignore"
```

- [ ] **Step 3: Create `backend/pyproject.toml`**

```toml
[project]
name = "windview-backend"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "sqlalchemy[asyncio]>=2.0.36",
    "asyncpg>=0.30.0",
    "alembic>=1.14.0",
    "pydantic-settings>=2.6.0",
    "httpx>=0.28.0",
    "structlog>=24.4.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3.0",
    "pytest-asyncio>=0.24.0",
    "httpx>=0.28.0",
    "aiosqlite>=0.20.0",
]

[build-system]
requires = ["setuptools>=75.0"]
build-backend = "setuptools.build_meta"

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

- [ ] **Step 4: Create `backend/Dockerfile`**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir .

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

- [ ] **Step 5: Create `backend/.env.example`**

```env
DATABASE_URL=postgresql+asyncpg://windview:windview@postgres:5432/windview
ELEXON_BASE_URL=https://data.elexon.co.uk/bmrs/api/v1
CORS_ORIGINS=http://localhost:3000
GATE_CLOSURE_HOUR=9
```

- [ ] **Step 6: Scaffold frontend with Vite**

Run:
```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
npm install react-router-dom@6 @tanstack/react-query recharts lucide-react zustand axios tailwindcss @tailwindcss/vite
```

- [ ] **Step 7: Create `frontend/Dockerfile`**

```dockerfile
FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
```

- [ ] **Step 8: Configure Vite proxy and Tailwind**

File: `frontend/vite.config.ts`

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
```

File: `frontend/src/index.css` — replace contents with:

```css
@import "tailwindcss";
```

- [ ] **Step 9: Create `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: windview
      POSTGRES_PASSWORD: windview
      POSTGRES_DB: windview
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U windview"]
      interval: 5s
      timeout: 3s
      retries: 5

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://windview:windview@postgres:5432/windview
      ELEXON_BASE_URL: https://data.elexon.co.uk/bmrs/api/v1
      CORS_ORIGINS: http://localhost:3000
      GATE_CLOSURE_HOUR: "9"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./backend:/app

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
      - /app/node_modules

volumes:
  postgres_data:
```

- [ ] **Step 10: Commit scaffolding**

```bash
git add -A
git commit -m "chore: project scaffolding with Docker Compose, backend and frontend"
```

---

## Task 2: Backend core — config, database, and ORM models

**Files:**
- Create: `backend/app/__init__.py`
- Create: `backend/app/core/__init__.py`
- Create: `backend/app/core/config.py`
- Create: `backend/app/core/database.py`
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/wind_actual.py`
- Create: `backend/app/models/wind_forecast.py`
- Create: `backend/app/models/sync_log.py`

- [ ] **Step 1: Create package init files**

Create empty `__init__.py` in: `backend/app/`, `backend/app/core/`, `backend/app/models/`.

- [ ] **Step 2: Create `backend/app/core/config.py`**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://windview:windview@localhost:5432/windview"
    elexon_base_url: str = "https://data.elexon.co.uk/bmrs/api/v1"
    cors_origins: str = "http://localhost:3000"
    gate_closure_hour: int = 9

    model_config = {"env_file": ".env"}


settings = Settings()
```

- [ ] **Step 3: Create `backend/app/core/database.py`**

```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

engine = create_async_engine(settings.database_url, echo=False)
async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_session() -> AsyncSession:
    async with async_session_factory() as session:
        yield session
```

- [ ] **Step 4: Create `backend/app/models/wind_actual.py`**

```python
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
```

- [ ] **Step 5: Create `backend/app/models/wind_forecast.py`**

```python
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
```

- [ ] **Step 6: Create `backend/app/models/sync_log.py`**

```python
from datetime import datetime

from sqlalchemy import BigInteger, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SyncLog(Base):
    __tablename__ = "sync_log"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    dataset: Mapped[str] = mapped_column(String(20), nullable=False)
    started_at: Mapped[datetime] = mapped_column(nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    records_fetched: Mapped[int] = mapped_column(Integer, default=0)
    records_upserted: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="running")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
```

- [ ] **Step 7: Create `backend/app/models/__init__.py` with all exports**

```python
from app.models.sync_log import SyncLog
from app.models.wind_actual import WindActual
from app.models.wind_forecast import WindForecast

__all__ = ["WindActual", "WindForecast", "SyncLog"]
```

- [ ] **Step 8: Commit**

```bash
git add backend/
git commit -m "feat: backend core config, database engine, and ORM models"
```

---

## Task 3: Alembic migrations

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/versions/` (auto-generated)

- [ ] **Step 1: Initialize Alembic**

Run from `backend/`:
```bash
cd backend
pip install -e ".[dev]"
alembic init alembic
```

- [ ] **Step 2: Edit `backend/alembic/env.py`**

Replace the contents of `env.py` with:

```python
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.core.database import Base
from app.models import WindActual, WindForecast, SyncLog  # noqa: F401

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(url=settings.database_url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    connectable = create_async_engine(settings.database_url)
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
```

- [ ] **Step 3: Update `backend/alembic.ini` sqlalchemy.url**

Set `sqlalchemy.url` to empty (we use `settings.database_url` in env.py):
```ini
sqlalchemy.url =
```

- [ ] **Step 4: Generate initial migration**

Run (requires a running PostgreSQL — use `docker compose up postgres -d` first):
```bash
alembic revision --autogenerate -m "create wind_actuals wind_forecasts sync_log tables"
```

- [ ] **Step 5: Apply migration**

```bash
alembic upgrade head
```

- [ ] **Step 6: Commit**

```bash
git add backend/alembic/ backend/alembic.ini
git commit -m "feat: Alembic migrations for wind_actuals, wind_forecasts, sync_log"
```

---

## Task 4: Pydantic schemas

**Files:**
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/schemas/forecast.py`
- Create: `backend/app/schemas/actual.py`
- Create: `backend/app/schemas/accuracy.py`

- [ ] **Step 1: Create `backend/app/schemas/forecast.py`**

```python
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
```

- [ ] **Step 2: Create `backend/app/schemas/actual.py`**

```python
from datetime import date, datetime

from pydantic import BaseModel


class ActualPointSchema(BaseModel):
    start_time: datetime
    settlement_period: int
    generation_mw: int


class ActualsByDateResponse(BaseModel):
    date: date
    points: list[ActualPointSchema]
```

- [ ] **Step 3: Create `backend/app/schemas/accuracy.py`**

```python
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
```

- [ ] **Step 4: Create `backend/app/schemas/__init__.py`**

```python
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/
git commit -m "feat: Pydantic request/response schemas for all API endpoints"
```

---

## Task 5: Repositories — data access layer

**Files:**
- Create: `backend/app/repositories/__init__.py`
- Create: `backend/app/repositories/forecast_repo.py`
- Create: `backend/app/repositories/actual_repo.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/unit/__init__.py`
- Create: `backend/tests/unit/test_accuracy_engine.py` (placeholder — tests come in Task 6)

- [ ] **Step 1: Create `backend/app/repositories/forecast_repo.py`**

```python
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.wind_forecast import WindForecast


class ForecastRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_latest_run_before(self, delivery_date: date, before_time: datetime) -> datetime | None:
        start_of_day = datetime(delivery_date.year, delivery_date.month, delivery_date.day)
        end_of_day = datetime(delivery_date.year, delivery_date.month, delivery_date.day, 23, 59, 59)

        stmt = (
            select(WindForecast.publish_time)
            .where(
                WindForecast.start_time >= start_of_day,
                WindForecast.start_time <= end_of_day,
                WindForecast.publish_time < before_time,
            )
            .order_by(WindForecast.publish_time.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_forecasts_by_run(self, delivery_date: date, publish_time: datetime) -> list[WindForecast]:
        start_of_day = datetime(delivery_date.year, delivery_date.month, delivery_date.day)
        end_of_day = datetime(delivery_date.year, delivery_date.month, delivery_date.day, 23, 59, 59)

        stmt = (
            select(WindForecast)
            .where(
                WindForecast.start_time >= start_of_day,
                WindForecast.start_time <= end_of_day,
                WindForecast.publish_time == publish_time,
            )
            .order_by(WindForecast.start_time)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_all_runs_for_date(self, delivery_date: date) -> list[WindForecast]:
        start_of_day = datetime(delivery_date.year, delivery_date.month, delivery_date.day)
        end_of_day = datetime(delivery_date.year, delivery_date.month, delivery_date.day, 23, 59, 59)

        stmt = (
            select(WindForecast)
            .where(
                WindForecast.start_time >= start_of_day,
                WindForecast.start_time <= end_of_day,
            )
            .order_by(WindForecast.publish_time.desc(), WindForecast.start_time)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_forecasts_in_range(self, from_date: date, to_date: date, gate_hour: int) -> list[WindForecast]:
        """Get the latest-before-gate forecast for each delivery date in range."""
        from sqlalchemy import func, and_

        from_dt = datetime(from_date.year, from_date.month, from_date.day)
        to_dt = datetime(to_date.year, to_date.month, to_date.day, 23, 59, 59)

        latest_run_subq = (
            select(
                func.date(WindForecast.start_time).label("delivery_date"),
                func.max(WindForecast.publish_time).label("max_publish"),
            )
            .where(
                WindForecast.start_time >= from_dt,
                WindForecast.start_time <= to_dt,
            )
            .group_by(func.date(WindForecast.start_time))
            .subquery()
        )

        stmt = (
            select(WindForecast)
            .join(
                latest_run_subq,
                and_(
                    func.date(WindForecast.start_time) == latest_run_subq.c.delivery_date,
                    WindForecast.publish_time == latest_run_subq.c.max_publish,
                ),
            )
            .order_by(WindForecast.start_time)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
```

- [ ] **Step 2: Create `backend/app/repositories/actual_repo.py`**

```python
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.wind_actual import WindActual


class ActualRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_date(self, target_date: date) -> list[WindActual]:
        stmt = (
            select(WindActual)
            .where(WindActual.settlement_date == target_date)
            .order_by(WindActual.start_time)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_in_range(self, from_date: date, to_date: date) -> list[WindActual]:
        stmt = (
            select(WindActual)
            .where(
                WindActual.settlement_date >= from_date,
                WindActual.settlement_date <= to_date,
            )
            .order_by(WindActual.start_time)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_latest(self) -> WindActual | None:
        stmt = select(WindActual).order_by(WindActual.start_time.desc()).limit(1)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
```

- [ ] **Step 3: Create empty `__init__.py` files**

Create empty `__init__.py` in: `backend/app/repositories/`, `backend/tests/`, `backend/tests/unit/`.

- [ ] **Step 4: Commit**

```bash
git add backend/app/repositories/ backend/tests/
git commit -m "feat: forecast and actual repositories with async queries"
```

---

## Task 6: Accuracy engine — pure business logic with tests

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/accuracy_engine.py`
- Create: `backend/tests/unit/test_accuracy_engine.py`

- [ ] **Step 1: Write tests for accuracy engine**

File: `backend/tests/unit/test_accuracy_engine.py`

```python
import math

from app.services.accuracy_engine import (
    compute_bias,
    compute_distribution,
    compute_hourly_mae,
    compute_mae,
    compute_mape,
    compute_percentiles,
    compute_rmse,
    compute_worst_cases,
)


def _make_pairs(errors: list[float]) -> list[tuple[float, float]]:
    """Create (forecast, actual) pairs from a list of errors (forecast - actual)."""
    return [(100 + e, 100) for e in errors]


def test_compute_mae_simple():
    pairs = _make_pairs([10, -20, 30, -40])
    assert compute_mae(pairs) == 25.0


def test_compute_mae_empty():
    assert compute_mae([]) == 0.0


def test_compute_rmse_simple():
    pairs = _make_pairs([10, -20, 30, -40])
    expected = math.sqrt((100 + 400 + 900 + 1600) / 4)
    assert abs(compute_rmse(pairs) - expected) < 0.01


def test_compute_mape_simple():
    pairs = [(110, 100), (90, 100), (120, 100)]
    expected = (10 / 100 + 10 / 100 + 20 / 100) / 3 * 100
    assert abs(compute_mape(pairs) - expected) < 0.01


def test_compute_mape_skips_zero_actuals():
    pairs = [(110, 100), (50, 0)]
    result = compute_mape(pairs)
    assert result == 10.0


def test_compute_bias_positive_means_overforecast():
    pairs = [(120, 100), (130, 100)]
    assert compute_bias(pairs) == 25.0


def test_compute_bias_negative_means_underforecast():
    pairs = [(80, 100), (70, 100)]
    assert compute_bias(pairs) == -25.0


def test_compute_percentiles():
    errors = list(range(-50, 51))
    p = compute_percentiles(errors)
    assert p["p50"] == 0.0
    assert p["p5"] < p["p25"] < p["p50"] < p["p75"] < p["p95"]


def test_compute_distribution():
    errors = [-300, -100, 0, 50, 100, 200, 400]
    bins = compute_distribution(errors, bin_width=250)
    total = sum(b["count"] for b in bins)
    assert total == len(errors)


def test_compute_hourly_mae():
    hour_errors = {0: [10, -20], 12: [30, -40, 50]}
    result = compute_hourly_mae(hour_errors)
    assert result[0]["hour"] == 0
    assert result[0]["mae"] == 15.0
    assert result[0]["count"] == 2
    assert result[12]["mae"] == 40.0


def test_compute_worst_cases():
    cases = [
        {"date": "2026-01-01", "hour": 9, "forecast_mw": 8000, "actual_mw": 11000, "error_mw": -3000},
        {"date": "2026-01-01", "hour": 10, "forecast_mw": 12000, "actual_mw": 11500, "error_mw": 500},
        {"date": "2026-01-02", "hour": 14, "forecast_mw": 15000, "actual_mw": 13000, "error_mw": 2000},
    ]
    worst = compute_worst_cases(cases, limit=2)
    assert len(worst) == 2
    assert abs(worst[0]["error_mw"]) >= abs(worst[1]["error_mw"])
    assert worst[0]["direction"] == "under"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
pytest tests/unit/test_accuracy_engine.py -v
```
Expected: ImportError — module doesn't exist yet.

- [ ] **Step 3: Implement accuracy engine**

File: `backend/app/services/accuracy_engine.py`

```python
import math
from collections import defaultdict


def compute_mae(pairs: list[tuple[float, float]]) -> float:
    if not pairs:
        return 0.0
    return sum(abs(f - a) for f, a in pairs) / len(pairs)


def compute_rmse(pairs: list[tuple[float, float]]) -> float:
    if not pairs:
        return 0.0
    return math.sqrt(sum((f - a) ** 2 for f, a in pairs) / len(pairs))


def compute_mape(pairs: list[tuple[float, float]]) -> float:
    valid = [(f, a) for f, a in pairs if a != 0]
    if not valid:
        return 0.0
    return sum(abs(f - a) / abs(a) for f, a in valid) / len(valid) * 100


def compute_bias(pairs: list[tuple[float, float]]) -> float:
    if not pairs:
        return 0.0
    return sum(f - a for f, a in pairs) / len(pairs)


def compute_percentiles(errors: list[float]) -> dict[str, float]:
    if not errors:
        return {k: 0.0 for k in ["p5", "p25", "p50", "p75", "p90", "p95"]}
    sorted_errors = sorted(errors)
    n = len(sorted_errors)

    def _pct(p: float) -> float:
        idx = p / 100 * (n - 1)
        lo = int(idx)
        hi = min(lo + 1, n - 1)
        frac = idx - lo
        return sorted_errors[lo] * (1 - frac) + sorted_errors[hi] * frac

    return {
        "p5": round(_pct(5), 1),
        "p25": round(_pct(25), 1),
        "p50": round(_pct(50), 1),
        "p75": round(_pct(75), 1),
        "p90": round(_pct(90), 1),
        "p95": round(_pct(95), 1),
    }


def compute_distribution(errors: list[float], bin_width: float = 250) -> list[dict]:
    if not errors:
        return []
    min_e = math.floor(min(errors) / bin_width) * bin_width
    max_e = math.ceil(max(errors) / bin_width) * bin_width
    bins = []
    lower = min_e
    while lower < max_e:
        upper = lower + bin_width
        count = sum(1 for e in errors if lower <= e < upper)
        bins.append({"lower": lower, "upper": upper, "count": count})
        lower = upper
    leftover = sum(1 for e in errors if e >= max_e)
    if leftover > 0 and bins:
        bins[-1]["count"] += leftover
    return bins


def compute_hourly_mae(hour_errors: dict[int, list[float]]) -> dict[int, dict]:
    result = {}
    for hour in sorted(hour_errors.keys()):
        errors = hour_errors[hour]
        result[hour] = {
            "hour": hour,
            "mae": round(sum(abs(e) for e in errors) / len(errors), 1) if errors else 0.0,
            "count": len(errors),
        }
    return result


def compute_worst_cases(cases: list[dict], limit: int = 10) -> list[dict]:
    sorted_cases = sorted(cases, key=lambda c: abs(c["error_mw"]), reverse=True)
    for case in sorted_cases:
        case["direction"] = "over" if case["error_mw"] > 0 else "under"
    return sorted_cases[:limit]
```

- [ ] **Step 4: Create empty `backend/app/services/__init__.py`**

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend
pytest tests/unit/test_accuracy_engine.py -v
```
Expected: All 10 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/ backend/tests/
git commit -m "feat: accuracy engine with MAE, RMSE, MAPE, bias, percentiles, distribution"
```

---

## Task 7: Services — forecast, actual, and accuracy

**Files:**
- Create: `backend/app/services/forecast_service.py`
- Create: `backend/app/services/actual_service.py`
- Create: `backend/app/services/accuracy_service.py`

- [ ] **Step 1: Create `backend/app/services/forecast_service.py`**

```python
from datetime import date, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.repositories.forecast_repo import ForecastRepository
from app.schemas.forecast import ForecastAtGateResponse, ForecastPointSchema


class ForecastService:
    def __init__(self, session: AsyncSession):
        self.repo = ForecastRepository(session)

    async def get_latest_at_gate(self, delivery_date: date) -> ForecastAtGateResponse | None:
        gate_day = delivery_date - timedelta(days=1)
        gate_time = datetime(gate_day.year, gate_day.month, gate_day.day, settings.gate_closure_hour)

        latest_publish = await self.repo.get_latest_run_before(delivery_date, gate_time)
        if latest_publish is None:
            return None

        forecasts = await self.repo.get_forecasts_by_run(delivery_date, latest_publish)
        points = [
            ForecastPointSchema(start_time=f.start_time, generation_mw=f.generation_mw)
            for f in forecasts
        ]
        return ForecastAtGateResponse(
            publish_time=latest_publish,
            delivery_date=delivery_date,
            points=points,
        )

    async def get_by_date(self, delivery_date: date):
        return await self.repo.get_all_runs_for_date(delivery_date)
```

- [ ] **Step 2: Create `backend/app/services/actual_service.py`**

```python
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.actual_repo import ActualRepository
from app.schemas.actual import ActualPointSchema, ActualsByDateResponse


class ActualService:
    def __init__(self, session: AsyncSession):
        self.repo = ActualRepository(session)

    async def get_by_date(self, target_date: date) -> ActualsByDateResponse:
        actuals = await self.repo.get_by_date(target_date)
        points = [
            ActualPointSchema(
                start_time=a.start_time,
                settlement_period=a.settlement_period,
                generation_mw=a.generation_mw,
            )
            for a in actuals
        ]
        return ActualsByDateResponse(date=target_date, points=points)

    async def get_latest(self):
        return await self.repo.get_latest()
```

- [ ] **Step 3: Create `backend/app/services/accuracy_service.py`**

```python
from collections import defaultdict
from datetime import date, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.repositories.actual_repo import ActualRepository
from app.repositories.forecast_repo import ForecastRepository
from app.services.accuracy_engine import (
    compute_bias,
    compute_distribution,
    compute_hourly_mae,
    compute_mae,
    compute_mape,
    compute_percentiles,
    compute_rmse,
    compute_worst_cases,
)


class AccuracyService:
    def __init__(self, session: AsyncSession):
        self.forecast_repo = ForecastRepository(session)
        self.actual_repo = ActualRepository(session)

    async def _build_pairs(self, from_date: date, to_date: date):
        actuals = await self.actual_repo.get_in_range(from_date, to_date)
        forecasts = await self.forecast_repo.get_forecasts_in_range(from_date, to_date, settings.gate_closure_hour)

        actual_by_hour = {}
        for a in actuals:
            hour_key = a.start_time.replace(minute=0, second=0, microsecond=0)
            if hour_key not in actual_by_hour:
                actual_by_hour[hour_key] = []
            actual_by_hour[hour_key].append(a.generation_mw)

        actual_hourly_avg = {k: sum(v) / len(v) for k, v in actual_by_hour.items()}

        pairs = []
        details = []
        for f in forecasts:
            hour_key = f.start_time.replace(minute=0, second=0, microsecond=0)
            if hour_key in actual_hourly_avg:
                actual_mw = actual_hourly_avg[hour_key]
                error = f.generation_mw - actual_mw
                pairs.append((f.generation_mw, actual_mw))
                details.append({
                    "date": f.start_time.strftime("%Y-%m-%d"),
                    "hour": f.start_time.hour,
                    "forecast_mw": f.generation_mw,
                    "actual_mw": round(actual_mw),
                    "error_mw": round(error),
                })
        return pairs, details

    async def get_summary(self, from_date: date, to_date: date):
        pairs, _ = await self._build_pairs(from_date, to_date)
        return {
            "mae": round(compute_mae(pairs), 1),
            "rmse": round(compute_rmse(pairs), 1),
            "mape": round(compute_mape(pairs), 1),
            "bias": round(compute_bias(pairs), 1),
            "count": len(pairs),
        }

    async def get_daily(self, from_date: date, to_date: date):
        pairs, details = await self._build_pairs(from_date, to_date)
        by_date = defaultdict(list)
        for d in details:
            by_date[d["date"]].append((d["forecast_mw"], d["actual_mw"]))

        result = []
        for dt_str in sorted(by_date.keys()):
            day_pairs = by_date[dt_str]
            result.append({
                "date": dt_str,
                "mae": round(compute_mae(day_pairs), 1),
                "rmse": round(compute_rmse(day_pairs), 1),
                "bias": round(compute_bias(day_pairs), 1),
            })
        return result

    async def get_distribution(self, from_date: date, to_date: date, bin_width: float = 250):
        pairs, details = await self._build_pairs(from_date, to_date)
        errors = [d["error_mw"] for d in details]
        return {
            "bins": compute_distribution(errors, bin_width),
            "percentiles": compute_percentiles(errors),
        }

    async def get_hourly(self, from_date: date, to_date: date):
        _, details = await self._build_pairs(from_date, to_date)
        hour_errors = defaultdict(list)
        for d in details:
            hour_errors[d["hour"]].append(d["error_mw"])
        hourly = compute_hourly_mae(hour_errors)
        return [hourly[h] for h in sorted(hourly.keys())]

    async def get_worst_cases(self, from_date: date, to_date: date, limit: int = 10):
        _, details = await self._build_pairs(from_date, to_date)
        return compute_worst_cases(details, limit)
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/
git commit -m "feat: forecast, actual, and accuracy services with business logic"
```

---

## Task 8: Elexon sync client and service

**Files:**
- Create: `backend/app/sync/__init__.py`
- Create: `backend/app/sync/elexon_client.py`
- Create: `backend/app/sync/sync_service.py`

- [ ] **Step 1: Create `backend/app/sync/elexon_client.py`**

```python
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
```

- [ ] **Step 2: Create `backend/app/sync/sync_service.py`**

```python
from datetime import datetime

import structlog
from sqlalchemy import text
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
```

- [ ] **Step 3: Create empty `backend/app/sync/__init__.py`**

- [ ] **Step 4: Commit**

```bash
git add backend/app/sync/
git commit -m "feat: Elexon BMRS client and data sync service with upsert"
```

---

## Task 9: API routes and FastAPI app

**Files:**
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/api/deps.py`
- Create: `backend/app/api/routes/__init__.py`
- Create: `backend/app/api/routes/forecasts.py`
- Create: `backend/app/api/routes/actuals.py`
- Create: `backend/app/api/routes/accuracy.py`
- Create: `backend/app/api/routes/health.py`
- Create: `backend/app/main.py`

- [ ] **Step 1: Create `backend/app/api/deps.py`**

```python
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session
```

- [ ] **Step 2: Create `backend/app/api/routes/forecasts.py`**

```python
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
```

- [ ] **Step 3: Create `backend/app/api/routes/actuals.py`**

```python
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.actual import ActualsByDateResponse
from app.services.actual_service import ActualService

router = APIRouter(prefix="/api/actuals", tags=["actuals"])


@router.get("/by-date", response_model=ActualsByDateResponse)
async def get_actuals_by_date(
    date: date,
    db: AsyncSession = Depends(get_db),
):
    service = ActualService(db)
    return await service.get_by_date(date)
```

- [ ] **Step 4: Create `backend/app/api/routes/accuracy.py`**

```python
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
```

- [ ] **Step 5: Create `backend/app/api/routes/health.py`**

```python
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
```

- [ ] **Step 6: Create `backend/app/main.py`**

```python
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import accuracy, actuals, forecasts, health
from app.core.config import settings
from app.core.database import engine

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(),
    ],
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(title="WindView API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forecasts.router)
app.include_router(actuals.router)
app.include_router(accuracy.router)
app.include_router(health.router)
```

- [ ] **Step 7: Create empty `__init__.py` files**

Create empty `__init__.py` in: `backend/app/api/`, `backend/app/api/routes/`.

- [ ] **Step 8: Test the backend starts**

```bash
cd backend
uvicorn app.main:app --reload
```

Visit `http://localhost:8000/docs` — should show FastAPI interactive docs with all endpoints.

- [ ] **Step 9: Commit**

```bash
git add backend/app/api/ backend/app/main.py
git commit -m "feat: FastAPI app with all API routes, CORS, health check, and sync trigger"
```

---

## Task 10: Frontend data layer

**Files:**
- Create: `frontend/src/data/api/client.ts`
- Create: `frontend/src/data/api/forecasts.api.ts`
- Create: `frontend/src/data/api/actuals.api.ts`
- Create: `frontend/src/data/api/accuracy.api.ts`
- Create: `frontend/src/data/types/forecast.dto.ts`
- Create: `frontend/src/data/types/actual.dto.ts`
- Create: `frontend/src/data/types/accuracy.dto.ts`
- Create: `frontend/src/data/queries/useForecastsQuery.ts`
- Create: `frontend/src/data/queries/useActualsQuery.ts`
- Create: `frontend/src/data/queries/useAccuracyQuery.ts`

- [ ] **Step 1: Create `frontend/src/data/types/forecast.dto.ts`**

```typescript
export interface ForecastPointDTO {
  start_time: string;
  generation_mw: number;
}

export interface ForecastAtGateDTO {
  publish_time: string;
  delivery_date: string;
  points: ForecastPointDTO[];
}
```

- [ ] **Step 2: Create `frontend/src/data/types/actual.dto.ts`**

```typescript
export interface ActualPointDTO {
  start_time: string;
  settlement_period: number;
  generation_mw: number;
}

export interface ActualsByDateDTO {
  date: string;
  points: ActualPointDTO[];
}
```

- [ ] **Step 3: Create `frontend/src/data/types/accuracy.dto.ts`**

```typescript
export interface AccuracySummaryDTO {
  mae: number;
  rmse: number;
  mape: number;
  bias: number;
  count: number;
}

export interface DailyAccuracyDTO {
  date: string;
  mae: number;
  rmse: number;
  bias: number;
}

export interface DistributionBinDTO {
  lower: number;
  upper: number;
  count: number;
}

export interface PercentilesDTO {
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
}

export interface DistributionDTO {
  bins: DistributionBinDTO[];
  percentiles: PercentilesDTO;
}

export interface HourlyAccuracyDTO {
  hour: number;
  mae: number;
  count: number;
}

export interface WorstCaseDTO {
  date: string;
  hour: number;
  forecast_mw: number;
  actual_mw: number;
  error_mw: number;
  direction: string;
}
```

- [ ] **Step 4: Create `frontend/src/data/api/client.ts`**

```typescript
import axios from "axios";

export const apiClient = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});
```

- [ ] **Step 5: Create `frontend/src/data/api/forecasts.api.ts`**

```typescript
import { apiClient } from "./client";
import type { ForecastAtGateDTO } from "../types/forecast.dto";

export async function getLatestAtGate(deliveryDate: string): Promise<ForecastAtGateDTO> {
  const { data } = await apiClient.get("/forecasts/latest-at-gate", {
    params: { delivery_date: deliveryDate },
  });
  return data;
}
```

- [ ] **Step 6: Create `frontend/src/data/api/actuals.api.ts`**

```typescript
import { apiClient } from "./client";
import type { ActualsByDateDTO } from "../types/actual.dto";

export async function getActualsByDate(date: string): Promise<ActualsByDateDTO> {
  const { data } = await apiClient.get("/actuals/by-date", {
    params: { date },
  });
  return data;
}
```

- [ ] **Step 7: Create `frontend/src/data/api/accuracy.api.ts`**

```typescript
import { apiClient } from "./client";
import type {
  AccuracySummaryDTO,
  DailyAccuracyDTO,
  DistributionDTO,
  HourlyAccuracyDTO,
  WorstCaseDTO,
} from "../types/accuracy.dto";

const DEFAULT_PARAMS = { from_date: "2026-01-01", to_date: "2026-01-31" };

export async function getAccuracySummary(): Promise<AccuracySummaryDTO> {
  const { data } = await apiClient.get("/accuracy/summary", { params: DEFAULT_PARAMS });
  return data;
}

export async function getDailyAccuracy(): Promise<DailyAccuracyDTO[]> {
  const { data } = await apiClient.get("/accuracy/daily", { params: DEFAULT_PARAMS });
  return data;
}

export async function getDistribution(binWidth = 250): Promise<DistributionDTO> {
  const { data } = await apiClient.get("/accuracy/distribution", {
    params: { ...DEFAULT_PARAMS, bin_width_mw: binWidth },
  });
  return data;
}

export async function getHourlyAccuracy(): Promise<HourlyAccuracyDTO[]> {
  const { data } = await apiClient.get("/accuracy/hourly", { params: DEFAULT_PARAMS });
  return data;
}

export async function getWorstCases(limit = 10): Promise<WorstCaseDTO[]> {
  const { data } = await apiClient.get("/accuracy/worst-cases", {
    params: { ...DEFAULT_PARAMS, limit },
  });
  return data;
}
```

- [ ] **Step 8: Create `frontend/src/data/queries/useForecastsQuery.ts`**

```typescript
import { useQuery } from "@tanstack/react-query";
import { getLatestAtGate } from "../api/forecasts.api";

export function useLatestForecastAtGate(deliveryDate: string) {
  return useQuery({
    queryKey: ["forecast", "latest-at-gate", deliveryDate],
    queryFn: () => getLatestAtGate(deliveryDate),
    enabled: !!deliveryDate,
  });
}
```

- [ ] **Step 9: Create `frontend/src/data/queries/useActualsQuery.ts`**

```typescript
import { useQuery } from "@tanstack/react-query";
import { getActualsByDate } from "../api/actuals.api";

export function useActualsByDate(date: string) {
  return useQuery({
    queryKey: ["actuals", "by-date", date],
    queryFn: () => getActualsByDate(date),
    enabled: !!date,
  });
}
```

- [ ] **Step 10: Create `frontend/src/data/queries/useAccuracyQuery.ts`**

```typescript
import { useQuery } from "@tanstack/react-query";
import {
  getAccuracySummary,
  getDailyAccuracy,
  getDistribution,
  getHourlyAccuracy,
  getWorstCases,
} from "../api/accuracy.api";

export function useAccuracySummary() {
  return useQuery({ queryKey: ["accuracy", "summary"], queryFn: getAccuracySummary });
}

export function useDailyAccuracy() {
  return useQuery({ queryKey: ["accuracy", "daily"], queryFn: getDailyAccuracy });
}

export function useDistribution(binWidth = 250) {
  return useQuery({
    queryKey: ["accuracy", "distribution", binWidth],
    queryFn: () => getDistribution(binWidth),
  });
}

export function useHourlyAccuracy() {
  return useQuery({ queryKey: ["accuracy", "hourly"], queryFn: getHourlyAccuracy });
}

export function useWorstCases(limit = 10) {
  return useQuery({
    queryKey: ["accuracy", "worst-cases", limit],
    queryFn: () => getWorstCases(limit),
  });
}
```

- [ ] **Step 11: Commit**

```bash
git add frontend/src/data/
git commit -m "feat: frontend data layer — API client, DTOs, and TanStack Query hooks"
```

---

## Task 11: Frontend shared utilities and theme

**Files:**
- Create: `frontend/src/shared/constants/config.ts`
- Create: `frontend/src/shared/constants/routes.ts`
- Create: `frontend/src/shared/utils/number.utils.ts`
- Create: `frontend/src/shared/utils/date.utils.ts`
- Create: `frontend/src/shared/theme/useTheme.ts`
- Create: `frontend/src/shared/theme/ThemeProvider.tsx`

- [ ] **Step 1: Create `frontend/src/shared/constants/config.ts`**

```typescript
export const GATE_CLOSURE_HOUR = 9;
export const TIMEZONE = "Europe/London";
export const DEFAULT_DELIVERY_DATE = "2026-01-02";
export const JAN_2026_START = "2026-01-01";
export const JAN_2026_END = "2026-01-31";
```

- [ ] **Step 2: Create `frontend/src/shared/constants/routes.ts`**

```typescript
export const ROUTES = {
  DASHBOARD: "/",
  FORECAST_EXPLORER: "/forecast",
  ACCURACY_REPORT: "/accuracy",
} as const;
```

- [ ] **Step 3: Create `frontend/src/shared/utils/number.utils.ts`**

```typescript
export function formatMW(value: number): string {
  return new Intl.NumberFormat("en-GB").format(Math.round(value));
}

export function formatDelta(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatMW(value)} MW`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}
```

- [ ] **Step 4: Create `frontend/src/shared/utils/date.utils.ts`**

```typescript
export function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}

export function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function formatDateShort(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}
```

- [ ] **Step 5: Create `frontend/src/shared/theme/useTheme.ts`**

```typescript
import { create } from "zustand";

interface ThemeState {
  mode: "light" | "dark";
  toggle: () => void;
}

export const useTheme = create<ThemeState>((set) => ({
  mode:
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
  toggle: () =>
    set((state) => {
      const next = state.mode === "light" ? "dark" : "light";
      document.documentElement.classList.toggle("dark", next === "dark");
      return { mode: next };
    }),
}));
```

- [ ] **Step 6: Create `frontend/src/shared/theme/ThemeProvider.tsx`**

```tsx
import { useEffect, type ReactNode } from "react";
import { useTheme } from "./useTheme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useTheme((s) => s.mode);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, [mode]);

  return <>{children}</>;
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/shared/
git commit -m "feat: shared utilities — config, routes, formatting, and theme store"
```

---

## Task 12: Frontend domain hooks

**Files:**
- Create: `frontend/src/domain/services/formatting.service.ts`
- Create: `frontend/src/domain/hooks/useDashboardData.ts`
- Create: `frontend/src/domain/hooks/useForecastExplorer.ts`
- Create: `frontend/src/domain/hooks/useAccuracyReport.ts`

- [ ] **Step 1: Create `frontend/src/domain/services/formatting.service.ts`**

```typescript
import { formatMW } from "../../shared/utils/number.utils";
import { formatTime } from "../../shared/utils/date.utils";

export interface ChartPoint {
  time: string;
  label: string;
  forecast?: number;
  actual?: number;
}

export function alignForecastAndActuals(
  forecastPoints: { start_time: string; generation_mw: number }[],
  actualPoints: { start_time: string; generation_mw: number }[],
): ChartPoint[] {
  const actualMap = new Map(actualPoints.map((a) => [a.start_time.slice(0, 13), a.generation_mw]));

  const points: ChartPoint[] = [];
  for (const fp of forecastPoints) {
    const hourKey = fp.start_time.slice(0, 13);
    points.push({
      time: fp.start_time,
      label: formatTime(fp.start_time),
      forecast: fp.generation_mw,
      actual: actualMap.get(hourKey),
    });
  }

  for (const ap of actualPoints) {
    const hourKey = ap.start_time.slice(0, 13);
    if (!points.some((p) => p.time.slice(0, 13) === hourKey)) {
      points.push({
        time: ap.start_time,
        label: formatTime(ap.start_time),
        actual: ap.generation_mw,
      });
    }
  }

  return points.sort((a, b) => a.time.localeCompare(b.time));
}
```

- [ ] **Step 2: Create `frontend/src/domain/hooks/useDashboardData.ts`**

```typescript
import { useLatestForecastAtGate } from "../../data/queries/useForecastsQuery";
import { useActualsByDate } from "../../data/queries/useActualsQuery";
import { useAccuracySummary } from "../../data/queries/useAccuracyQuery";
import { DEFAULT_DELIVERY_DATE } from "../../shared/constants/config";
import { alignForecastAndActuals } from "../services/formatting.service";

export function useDashboardData() {
  const forecast = useLatestForecastAtGate(DEFAULT_DELIVERY_DATE);
  const actuals = useActualsByDate(DEFAULT_DELIVERY_DATE);
  const accuracy = useAccuracySummary();

  const chartData =
    forecast.data && actuals.data
      ? alignForecastAndActuals(forecast.data.points, actuals.data.points)
      : [];

  const latestActual =
    actuals.data?.points && actuals.data.points.length > 0
      ? actuals.data.points[actuals.data.points.length - 1]
      : null;

  return {
    isLoading: forecast.isLoading || actuals.isLoading || accuracy.isLoading,
    forecast: forecast.data,
    latestActual,
    accuracy: accuracy.data,
    chartData,
  };
}
```

- [ ] **Step 3: Create `frontend/src/domain/hooks/useForecastExplorer.ts`**

```typescript
import { useState } from "react";
import { useLatestForecastAtGate } from "../../data/queries/useForecastsQuery";
import { useActualsByDate } from "../../data/queries/useActualsQuery";
import { DEFAULT_DELIVERY_DATE } from "../../shared/constants/config";
import { alignForecastAndActuals } from "../services/formatting.service";

export function useForecastExplorer() {
  const [deliveryDate, setDeliveryDate] = useState(DEFAULT_DELIVERY_DATE);

  const forecast = useLatestForecastAtGate(deliveryDate);
  const actuals = useActualsByDate(deliveryDate);

  const chartData =
    forecast.data && actuals.data
      ? alignForecastAndActuals(forecast.data.points, actuals.data.points)
      : [];

  const peakForecast = forecast.data
    ? forecast.data.points.reduce(
        (max, p) => (p.generation_mw > max.generation_mw ? p : max),
        forecast.data.points[0],
      )
    : null;

  return {
    deliveryDate,
    setDeliveryDate,
    isLoading: forecast.isLoading || actuals.isLoading,
    forecast: forecast.data,
    chartData,
    peakForecast,
  };
}
```

- [ ] **Step 4: Create `frontend/src/domain/hooks/useAccuracyReport.ts`**

```typescript
import {
  useAccuracySummary,
  useDailyAccuracy,
  useDistribution,
  useHourlyAccuracy,
  useWorstCases,
} from "../../data/queries/useAccuracyQuery";

export function useAccuracyReport() {
  const summary = useAccuracySummary();
  const daily = useDailyAccuracy();
  const distribution = useDistribution();
  const hourly = useHourlyAccuracy();
  const worstCases = useWorstCases();

  return {
    isLoading:
      summary.isLoading || daily.isLoading || distribution.isLoading || hourly.isLoading || worstCases.isLoading,
    summary: summary.data,
    daily: daily.data,
    distribution: distribution.data,
    hourly: hourly.data,
    worstCases: worstCases.data,
  };
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/domain/
git commit -m "feat: domain layer — formatting service and page-level composition hooks"
```

---

## Task 13: Frontend presentation — layout and shared components

**Files:**
- Create: `frontend/src/presentation/layouts/Sidebar.tsx`
- Create: `frontend/src/presentation/layouts/AppLayout.tsx`
- Create: `frontend/src/presentation/layouts/PageHeader.tsx`
- Create: `frontend/src/presentation/components/cards/MetricCard.tsx`
- Create: `frontend/src/presentation/components/cards/InfoPanel.tsx`
- Create: `frontend/src/presentation/components/cards/KeyValueCard.tsx`
- Create: `frontend/src/presentation/components/data-display/TabGroup.tsx`
- Create: `frontend/src/presentation/components/data-display/Badge.tsx`
- Create: `frontend/src/presentation/components/data-display/DataTable.tsx`
- Create: `frontend/src/presentation/components/feedback/LoadingSkeleton.tsx`

- [ ] **Step 1: Create `frontend/src/presentation/layouts/Sidebar.tsx`**

```tsx
import { NavLink } from "react-router-dom";
import { LayoutDashboard, TrendingUp, Target, Settings, Wind, Sun, Moon } from "lucide-react";
import { useTheme } from "../../shared/theme/useTheme";
import { ROUTES } from "../../shared/constants/routes";

const navItems = [
  { to: ROUTES.DASHBOARD, label: "Dashboard", icon: LayoutDashboard },
  { to: ROUTES.FORECAST_EXPLORER, label: "Forecast explorer", icon: TrendingUp },
  { to: ROUTES.ACCURACY_REPORT, label: "Accuracy report", icon: Target },
];

export function Sidebar() {
  const { mode, toggle } = useTheme();

  return (
    <aside className="w-56 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
          <Wind className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">WindView</div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400">Forecast analytics</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 px-3 pb-2">
          Analytics
        </div>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-medium"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`
            }
          >
            <Icon className="w-[18px] h-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Data synced
        </div>
        <div className="flex items-center justify-between">
          <button onClick={toggle} className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            {mode === "light" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {mode === "light" ? "Light" : "Dark"}
          </button>
          <button
            onClick={toggle}
            className={`relative w-9 h-5 rounded-full transition-colors ${
              mode === "dark" ? "bg-blue-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                mode === "dark" ? "translate-x-4" : ""
              }`}
            />
          </button>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create `frontend/src/presentation/layouts/AppLayout.tsx`**

```tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/src/presentation/layouts/PageHeader.tsx`**

```tsx
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Create `frontend/src/presentation/components/cards/MetricCard.tsx`**

```tsx
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  icon: LucideIcon;
  iconColor?: "blue" | "green" | "amber";
  label: string;
  value: string;
  subtitle?: string;
  tag?: ReactNode;
}

const iconBg = {
  blue: "bg-blue-50 dark:bg-blue-950 text-blue-500",
  green: "bg-emerald-50 dark:bg-emerald-950 text-emerald-500",
  amber: "bg-amber-50 dark:bg-amber-950 text-amber-500",
};

export function MetricCard({ icon: Icon, iconColor = "blue", label, value, subtitle, tag }: MetricCardProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 hover:ring-1 hover:ring-gray-200 dark:hover:ring-gray-700 transition-shadow">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${iconBg[iconColor]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-medium text-gray-900 dark:text-gray-100 tabular-nums">{value}</div>
      {subtitle && <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{subtitle}</div>}
      {tag}
    </div>
  );
}
```

- [ ] **Step 5: Create `frontend/src/presentation/components/cards/InfoPanel.tsx`**

```tsx
import { AlertTriangle, Info } from "lucide-react";
import type { ReactNode } from "react";

interface InfoPanelProps {
  variant: "warning" | "info";
  children: ReactNode;
}

export function InfoPanel({ variant, children }: InfoPanelProps) {
  const styles = {
    warning: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
    info: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
  };
  const Icon = variant === "warning" ? AlertTriangle : Info;

  return (
    <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs ${styles[variant]}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      {children}
    </div>
  );
}
```

- [ ] **Step 6: Create `frontend/src/presentation/components/cards/KeyValueCard.tsx`**

```tsx
import type { LucideIcon } from "lucide-react";

interface KVRow {
  label: string;
  value: string;
  valueColor?: string;
}

interface KeyValueCardProps {
  title: string;
  icon?: LucideIcon;
  rows: KVRow[];
}

export function KeyValueCard({ title, icon: Icon, rows }: KeyValueCardProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-1.5">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        {title}
      </div>
      <table className="w-full text-xs">
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.label} className={i < rows.length - 1 ? "border-b border-gray-200 dark:border-gray-800" : ""}>
              <td className="text-gray-500 dark:text-gray-400 py-2 w-2/5">{row.label}</td>
              <td className={`py-2 tabular-nums ${row.valueColor || "text-gray-900 dark:text-gray-100"}`}>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 7: Create `frontend/src/presentation/components/data-display/TabGroup.tsx`**

```tsx
interface TabGroupProps {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}

export function TabGroup({ tabs, active, onChange }: TabGroupProps) {
  return (
    <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-900 rounded-lg p-0.5 mb-5">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-3.5 py-1.5 rounded-md text-xs transition-all ${
            active === tab
              ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 8: Create `frontend/src/presentation/components/data-display/Badge.tsx`**

```tsx
interface BadgeProps {
  variant: "over" | "under";
  children: string;
}

export function Badge({ variant, children }: BadgeProps) {
  const styles = {
    over: "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400",
    under: "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${styles[variant]}`}>
      {children}
    </span>
  );
}
```

- [ ] **Step 9: Create `frontend/src/presentation/components/data-display/DataTable.tsx`**

```tsx
import type { ReactNode } from "react";

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
}

export function DataTable<T>({ columns, data }: DataTableProps<T>) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key} className="text-left py-2.5 px-3 text-[11px] text-gray-400 dark:text-gray-500 font-normal border-b border-gray-200 dark:border-gray-800">
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-900">
            {columns.map((col) => (
              <td key={col.key} className="py-2.5 px-3 text-gray-900 dark:text-gray-100 tabular-nums border-b border-gray-100 dark:border-gray-800/50">
                {col.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 10: Create `frontend/src/presentation/components/feedback/LoadingSkeleton.tsx`**

```tsx
export function LoadingSkeleton({ className = "h-48" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl ${className}`} />
  );
}
```

- [ ] **Step 11: Commit**

```bash
git add frontend/src/presentation/
git commit -m "feat: presentation layer — layout, metric cards, tabs, badges, data table, loading skeleton"
```

---

## Task 14: Frontend presentation — chart components

**Files:**
- Create: `frontend/src/presentation/components/charts/TimeSeriesChart.tsx`
- Create: `frontend/src/presentation/components/charts/ErrorHistogram.tsx`
- Create: `frontend/src/presentation/components/charts/DailyBarChart.tsx`
- Create: `frontend/src/presentation/components/charts/HourlyHeatmap.tsx`

- [ ] **Step 1: Create `frontend/src/presentation/components/charts/TimeSeriesChart.tsx`**

```tsx
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Area, ComposedChart } from "recharts";
import type { ChartPoint } from "../../../domain/services/formatting.service";

interface TimeSeriesChartProps {
  data: ChartPoint[];
  showErrorBand?: boolean;
}

export function TimeSeriesChart({ data, showErrorBand = false }: TimeSeriesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--color-gray-400)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--color-gray-200)" }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--color-gray-400)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          width={40}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid var(--color-gray-200)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
          formatter={(value: number) => [`${value.toLocaleString()} MW`]}
        />
        {showErrorBand && (
          <Area type="monotone" dataKey="forecast" fill="rgba(42,120,214,0.06)" stroke="none" />
        )}
        <Line type="monotone" dataKey="forecast" stroke="#2a78d6" strokeWidth={2} dot={false} name="Forecast" />
        <Line type="monotone" dataKey="actual" stroke="#1baf7a" strokeWidth={2} dot={false} strokeDasharray="5 3" name="Actual" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Create `frontend/src/presentation/components/charts/ErrorHistogram.tsx`**

```tsx
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import type { DistributionBinDTO } from "../../../data/types/accuracy.dto";

interface ErrorHistogramProps {
  bins: DistributionBinDTO[];
}

export function ErrorHistogram({ bins }: ErrorHistogramProps) {
  const data = bins.map((b) => ({
    range: `${b.lower >= 0 ? "+" : ""}${b.lower}`,
    count: b.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" vertical={false} />
        <XAxis
          dataKey="range"
          tick={{ fontSize: 9, fill: "var(--color-gray-400)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--color-gray-200)" }}
        />
        <YAxis tick={{ fontSize: 10, fill: "var(--color-gray-400)" }} tickLine={false} axisLine={false} width={30} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--color-gray-200)" }} />
        <Bar dataKey="count" fill="#eb6834" radius={[3, 3, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: Create `frontend/src/presentation/components/charts/DailyBarChart.tsx`**

```tsx
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import type { DailyAccuracyDTO } from "../../../data/types/accuracy.dto";

interface DailyBarChartProps {
  data: DailyAccuracyDTO[];
  highlightThreshold?: number;
}

export function DailyBarChart({ data, highlightThreshold }: DailyBarChartProps) {
  const threshold = highlightThreshold ?? (data.length ? Math.max(...data.map((d) => d.mae)) * 0.85 : Infinity);

  const chartData = data.map((d) => ({
    date: d.date.slice(5),
    mae: Math.round(d.mae),
  }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--color-gray-400)" }} tickLine={false} axisLine={{ stroke: "var(--color-gray-200)" }} />
        <YAxis tick={{ fontSize: 10, fill: "var(--color-gray-400)" }} tickLine={false} axisLine={false} width={35} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--color-gray-200)" }} />
        <Bar dataKey="mae" radius={[3, 3, 0, 0]} maxBarSize={12}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.mae >= threshold ? "#eb6834" : "#2a78d6"} opacity={entry.mae >= threshold ? 0.9 : 0.7} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 4: Create `frontend/src/presentation/components/charts/HourlyHeatmap.tsx`**

```tsx
import type { HourlyAccuracyDTO } from "../../../data/types/accuracy.dto";

interface HourlyHeatmapProps {
  data: HourlyAccuracyDTO[];
}

export function HourlyHeatmap({ data }: HourlyHeatmapProps) {
  const maxMae = Math.max(...data.map((d) => d.mae), 1);

  return (
    <div>
      <div className="grid grid-cols-[repeat(24,1fr)] gap-0.5">
        {Array.from({ length: 24 }, (_, hour) => {
          const point = data.find((d) => d.hour === hour);
          const intensity = point ? point.mae / maxMae : 0;
          const bg = `rgba(42, 120, 214, ${(intensity * 0.85 + 0.05).toFixed(2)})`;
          const textColor = intensity > 0.5 ? "text-white" : "text-gray-500 dark:text-gray-400";

          return (
            <div
              key={hour}
              className={`h-11 rounded flex items-end justify-center pb-1 ${textColor}`}
              style={{ background: bg }}
              title={`${hour}:00 — MAE: ${point ? Math.round(point.mae) : 0} MW`}
            >
              <span className="text-[8px]">{hour}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-3 text-[11px] text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1"><span className="w-3.5 h-2.5 rounded-sm" style={{ background: "rgba(42,120,214,0.1)" }} /> Low</span>
        <span className="flex items-center gap-1"><span className="w-3.5 h-2.5 rounded-sm" style={{ background: "rgba(42,120,214,0.5)" }} /> Medium</span>
        <span className="flex items-center gap-1"><span className="w-3.5 h-2.5 rounded-sm" style={{ background: "rgba(42,120,214,0.9)" }} /> High</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/presentation/components/charts/
git commit -m "feat: chart components — TimeSeriesChart, ErrorHistogram, DailyBarChart, HourlyHeatmap"
```

---

## Task 15: Frontend pages

**Files:**
- Create: `frontend/src/presentation/pages/DashboardPage.tsx`
- Create: `frontend/src/presentation/pages/ForecastExplorerPage.tsx`
- Create: `frontend/src/presentation/pages/AccuracyReportPage.tsx`

- [ ] **Step 1: Create `frontend/src/presentation/pages/DashboardPage.tsx`**

```tsx
import { Activity, Zap, Target, RefreshCw, Download } from "lucide-react";
import { PageHeader } from "../layouts/PageHeader";
import { MetricCard } from "../components/cards/MetricCard";
import { TimeSeriesChart } from "../components/charts/TimeSeriesChart";
import { LoadingSkeleton } from "../components/feedback/LoadingSkeleton";
import { useDashboardData } from "../../domain/hooks/useDashboardData";
import { formatMW, formatPercent } from "../../shared/utils/number.utils";
import { formatDate, formatTime } from "../../shared/utils/date.utils";

export function DashboardPage() {
  const { isLoading, forecast, latestActual, accuracy, chartData } = useDashboardData();

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="January 2026 — wind generation overview" />
        <div className="grid grid-cols-3 gap-3 mb-5"><LoadingSkeleton className="h-32" /><LoadingSkeleton className="h-32" /><LoadingSkeleton className="h-32" /></div>
        <LoadingSkeleton className="h-72" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="January 2026 — wind generation overview for day-ahead procurement"
        actions={
          <>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </>
        }
      />

      <div className="grid grid-cols-3 gap-3 mb-5">
        <MetricCard
          icon={Activity}
          iconColor="blue"
          label="Latest forecast"
          value={forecast ? `${formatMW(forecast.points[0]?.generation_mw ?? 0)} MW` : "—"}
          subtitle={forecast ? `For ${formatDate(forecast.delivery_date)}, pub ${formatTime(forecast.publish_time)}` : undefined}
        />
        <MetricCard
          icon={Zap}
          iconColor="green"
          label="Current generation"
          value={latestActual ? `${formatMW(latestActual.generation_mw)} MW` : "—"}
          subtitle={latestActual ? `${formatTime(latestActual.start_time)} settlement` : undefined}
        />
        <MetricCard
          icon={Target}
          iconColor="amber"
          label="Month-to-date MAE"
          value={accuracy ? `${formatMW(accuracy.mae)} MW` : "—"}
          tag={
            <span className="inline-flex items-center gap-1 text-[10px] mt-1.5 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-medium">
              MAPE {accuracy ? formatPercent(accuracy.mape) : "—"}
            </span>
          }
        />
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Forecast vs actual — {forecast ? formatDate(forecast.delivery_date) : ""}
          </span>
          <div className="flex gap-3 text-[11px] text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-[3px] rounded bg-blue-500" /> Forecast</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-[3px] rounded bg-emerald-500" /> Actual</span>
          </div>
        </div>
        <TimeSeriesChart data={chartData} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/src/presentation/pages/ForecastExplorerPage.tsx`**

```tsx
import { Calendar, Clock, Activity, FileText, Target } from "lucide-react";
import { PageHeader } from "../layouts/PageHeader";
import { TimeSeriesChart } from "../components/charts/TimeSeriesChart";
import { KeyValueCard } from "../components/cards/KeyValueCard";
import { LoadingSkeleton } from "../components/feedback/LoadingSkeleton";
import { useForecastExplorer } from "../../domain/hooks/useForecastExplorer";
import { formatMW, formatDelta } from "../../shared/utils/number.utils";
import { formatDate, formatTime } from "../../shared/utils/date.utils";

export function ForecastExplorerPage() {
  const { deliveryDate, setDeliveryDate, isLoading, forecast, chartData, peakForecast } =
    useForecastExplorer();

  return (
    <div>
      <PageHeader title="Forecast explorer" subtitle="Examine the forecast available at day-ahead gate closure" />

      <div className="flex gap-2.5 mb-5 flex-wrap">
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <div>
            <div className="text-[10px] text-gray-400">Delivery date</div>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              min="2026-01-01"
              max="2026-01-31"
              className="text-xs font-medium bg-transparent text-gray-900 dark:text-gray-100 outline-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <div>
            <div className="text-[10px] text-gray-400">Gate closure</div>
            <div className="text-xs font-medium text-gray-900 dark:text-gray-100">09:00 UK time</div>
          </div>
        </div>
        {forecast && (
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
            <Activity className="w-3.5 h-3.5 text-blue-500" />
            <div>
              <div className="text-[10px] text-gray-400">Forecast run</div>
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400">{formatTime(forecast.publish_time)} (latest)</div>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton className="h-64 mb-3" />
      ) : (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Forecast vs actual generation</span>
            <div className="flex gap-3 text-[11px] text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-[3px] rounded bg-blue-500" /> Forecast</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-[3px] rounded bg-emerald-500" /> Actual</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-[3px] rounded bg-blue-500/20" /> Error band</span>
            </div>
          </div>
          <TimeSeriesChart data={chartData} showErrorBand />
        </div>
      )}

      {forecast && (
        <div className="grid grid-cols-2 gap-3">
          <KeyValueCard
            title="Forecast metadata"
            icon={FileText}
            rows={[
              { label: "Published", value: `${formatDate(forecast.publish_time)}, ${formatTime(forecast.publish_time)} UTC` },
              { label: "Horizon", value: "14 – 38 hours ahead" },
              { label: "Resolution", value: `1 hour (${forecast.points.length} periods)` },
              { label: "Peak forecast", value: peakForecast ? `${formatMW(peakForecast.generation_mw)} MW at ${formatTime(peakForecast.start_time)}` : "—" },
            ]}
          />
          <KeyValueCard
            title="Day accuracy snapshot"
            icon={Target}
            rows={[
              { label: "MAE", value: "Computed from actuals" },
              { label: "Max overforecast", value: "—" },
              { label: "Max underforecast", value: "—" },
              { label: "Direction", value: "—" },
            ]}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/src/presentation/pages/AccuracyReportPage.tsx`**

```tsx
import { useState } from "react";
import { Download } from "lucide-react";
import { PageHeader } from "../layouts/PageHeader";
import { MetricCard } from "../components/cards/MetricCard";
import { TabGroup } from "../components/data-display/TabGroup";
import { DataTable } from "../components/data-display/DataTable";
import { Badge } from "../components/data-display/Badge";
import { InfoPanel } from "../components/cards/InfoPanel";
import { TimeSeriesChart } from "../components/charts/TimeSeriesChart";
import { ErrorHistogram } from "../components/charts/ErrorHistogram";
import { DailyBarChart } from "../components/charts/DailyBarChart";
import { HourlyHeatmap } from "../components/charts/HourlyHeatmap";
import { LoadingSkeleton } from "../components/feedback/LoadingSkeleton";
import { useAccuracyReport } from "../../domain/hooks/useAccuracyReport";
import { formatMW, formatDelta, formatPercent } from "../../shared/utils/number.utils";
import { Activity, TrendingUp, Target, BarChart3 } from "lucide-react";
import type { WorstCaseDTO } from "../../data/types/accuracy.dto";

const TABS = ["Summary", "Distribution", "Time of day", "Worst cases"];

export function AccuracyReportPage() {
  const [activeTab, setActiveTab] = useState("Summary");
  const { isLoading, summary, daily, distribution, hourly, worstCases } = useAccuracyReport();

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Accuracy report" subtitle="January 2026 — forecast error analysis" />
        <LoadingSkeleton className="h-96" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Accuracy report"
        subtitle="January 2026 — forecast error analysis across all settlement periods"
        actions={
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        }
      />

      <TabGroup tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === "Summary" && summary && (
        <>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <MetricCard icon={Activity} label="MAE" value={`${formatMW(summary.mae)} MW`} subtitle="Mean absolute error" />
            <MetricCard icon={TrendingUp} label="RMSE" value={`${formatMW(summary.rmse)} MW`} subtitle="Root mean square" />
            <MetricCard icon={Target} label="MAPE" value={formatPercent(summary.mape)} subtitle="Percentage error" />
            <MetricCard icon={BarChart3} iconColor="amber" label="Bias" value={formatDelta(summary.bias)} subtitle={summary.bias > 0 ? "Systematic over-forecast" : "Systematic under-forecast"} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Daily MAE trend</div>
              {daily && <DailyBarChart data={daily} />}
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Error distribution (MW)</div>
              {distribution && <ErrorHistogram bins={distribution.bins} />}
            </div>
          </div>

          <div className="mt-3">
            <InfoPanel variant="warning">
              Highest errors cluster around 08:00–11:00 (gate closure window). Consider applying a bias correction when procuring.
            </InfoPanel>
          </div>
        </>
      )}

      {activeTab === "Distribution" && distribution && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
          <div className="flex justify-between mb-3">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Forecast error histogram</span>
            <span className="text-[11px] text-gray-400">n = {summary?.count ?? 0} periods</span>
          </div>
          <ErrorHistogram bins={distribution.bins} />
          <div className="flex gap-5 mt-4 pt-3 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500">
            <span>P5: <b className="text-gray-900 dark:text-gray-100">{formatMW(distribution.percentiles.p5)} MW</b></span>
            <span>P25: <b className="text-gray-900 dark:text-gray-100">{formatMW(distribution.percentiles.p25)} MW</b></span>
            <span>Median: <b className="text-gray-900 dark:text-gray-100">{formatMW(distribution.percentiles.p50)} MW</b></span>
            <span>P75: <b className="text-gray-900 dark:text-gray-100">{formatMW(distribution.percentiles.p75)} MW</b></span>
            <span>P95: <b className="text-gray-900 dark:text-gray-100">{formatMW(distribution.percentiles.p95)} MW</b></span>
          </div>
        </div>
      )}

      {activeTab === "Time of day" && hourly && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">Mean absolute error by hour of day</div>
          <HourlyHeatmap data={hourly} />
        </div>
      )}

      {activeTab === "Worst cases" && worstCases && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Worst forecast errors</span>
            {distribution && (
              <span className="text-[11px] text-gray-400">
                P90: {formatMW(distribution.percentiles.p90)} MW · P95: {formatMW(distribution.percentiles.p95)} MW
              </span>
            )}
          </div>
          <DataTable<WorstCaseDTO>
            columns={[
              { key: "date", header: "Date", render: (r) => r.date.slice(5) },
              { key: "hour", header: "Hour", render: (r) => `${String(r.hour).padStart(2, "0")}:00` },
              { key: "forecast", header: "Forecast", render: (r) => `${formatMW(r.forecast_mw)} MW` },
              { key: "actual", header: "Actual", render: (r) => `${formatMW(r.actual_mw)} MW` },
              {
                key: "error",
                header: "Error",
                render: (r) => (
                  <span className={`font-medium ${r.error_mw > 0 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                    {formatDelta(r.error_mw)}
                  </span>
                ),
              },
              { key: "dir", header: "Direction", render: (r) => <Badge variant={r.direction === "over" ? "over" : "under"}>{r.direction === "over" ? "Over" : "Under"}</Badge> },
            ]}
            data={worstCases}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/presentation/pages/
git commit -m "feat: Dashboard, Forecast Explorer, and Accuracy Report pages"
```

---

## Task 16: Frontend App.tsx, routing, and entry point

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Replace `frontend/src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./shared/theme/ThemeProvider";
import { AppLayout } from "./presentation/layouts/AppLayout";
import { DashboardPage } from "./presentation/pages/DashboardPage";
import { ForecastExplorerPage } from "./presentation/pages/ForecastExplorerPage";
import { AccuracyReportPage } from "./presentation/pages/AccuracyReportPage";
import { ROUTES } from "./shared/constants/routes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
              <Route path={ROUTES.FORECAST_EXPLORER} element={<ForecastExplorerPage />} />
              <Route path={ROUTES.ACCURACY_REPORT} element={<AccuracyReportPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Replace `frontend/src/main.tsx`**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 3: Verify frontend compiles**

```bash
cd frontend
npm run build
```
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/main.tsx
git commit -m "feat: App routing, QueryClient, ThemeProvider, and entry point"
```

---

## Task 17: End-to-end verification

- [ ] **Step 1: Start all services**

```bash
docker compose up --build
```

- [ ] **Step 2: Run database migration**

```bash
docker compose exec backend alembic upgrade head
```

- [ ] **Step 3: Trigger data sync**

```bash
curl -X POST http://localhost:8000/api/sync/trigger
```

Wait for response `{"status":"success"}`. This pulls January 2026 wind actuals and forecasts from Elexon.

- [ ] **Step 4: Verify API endpoints**

```bash
curl "http://localhost:8000/api/health"
curl "http://localhost:8000/api/actuals/by-date?date=2026-01-02"
curl "http://localhost:8000/api/forecasts/latest-at-gate?delivery_date=2026-01-02"
curl "http://localhost:8000/api/accuracy/summary"
curl "http://localhost:8000/api/accuracy/daily"
curl "http://localhost:8000/api/accuracy/distribution"
curl "http://localhost:8000/api/accuracy/hourly"
curl "http://localhost:8000/api/accuracy/worst-cases"
```

Each should return valid JSON with data.

- [ ] **Step 5: Verify frontend in browser**

Open `http://localhost:3000`:
1. Dashboard loads with 3 metric cards and a forecast-vs-actual chart
2. Click "Forecast explorer" — filters render, chart loads, metadata cards populate
3. Change delivery date — chart updates
4. Click "Accuracy report" — summary tab shows 4 metrics + 2 charts + warning banner
5. Click Distribution tab — histogram with percentiles
6. Click Time of day tab — heatmap renders
7. Click Worst cases tab — table with colored error values and badges
8. Toggle theme — light/dark mode switches everywhere

- [ ] **Step 6: Run backend tests**

```bash
cd backend
pytest tests/ -v
```

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: end-to-end verification complete"
```
