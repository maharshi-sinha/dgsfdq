# WindView — Design Specification

## Overview

WindView is a web application for a UK energy utility's day-ahead procurement team. It helps them understand national wind generation forecasts from the Elexon BMRS data platform, evaluate forecast accuracy, and make informed purchasing decisions for the UK day-ahead wholesale electricity market.

The team needs to procure thermal power to cover the gap between consumer demand and renewable generation. Wind is weather-dependent and unpredictable, so the team relies on wind generation forecasts when deciding how much to buy. Gate closure for day-ahead decisions is around 09:00 UK time the day before delivery.

**Scope:** January 2026 data only. National-level wind generation actuals and forecasts from Elexon BMRS.

---

## Data Sources

### 1. Wind generation actuals (FUELHH)

- **Endpoint:** `https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream`
- **Filter:** `fuelType = "WIND"`
- **Resolution:** 30-minute settlement periods (48 per day)
- **Key fields:**
  - `startTime` — target delivery period start (UTC)
  - `generation` — actual wind generation in MW
  - `settlementDate` — delivery date
  - `settlementPeriod` — 1–48
  - `publishTime` — when the actual was published
- **January 2026:** ~1,488 WIND records (31 days x 48 periods)

### 2. Wind generation forecasts (WINDFOR)

- **Endpoint:** `https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream`
- **Resolution:** 1-hour periods
- **Forecast runs:** ~8 per day (roughly every 2–3 hours)
- **Horizon:** Each run covers ~3 days ahead (73 hourly data points)
- **Key fields:**
  - `startTime` — target delivery period start (UTC)
  - `generation` — forecasted wind generation in MW
  - `publishTime` — when this forecast run was created
- **January 2026:** ~18,000 forecast records (31 days x 8 runs x 73 points)

### 3. Resolution alignment

Actuals are 30-minute; forecasts are 1-hour. When comparing:
- Each forecast hour maps to two settlement periods
- The same forecast value applies to both half-hours within that hour
- Charts show the hourly resolution; accuracy calculations use the averaged pair

### 4. "Latest forecast at gate closure"

For a given delivery date D, the relevant forecast is:
1. Find all forecast runs with `publishTime < 09:00 UK time on (D - 1)` (UK is on GMT/UTC in January, so 09:00 UK = 09:00 UTC for January 2026)
2. Take the run with the latest `publishTime`
3. Extract the forecast values whose `startTime` falls on date D

---

## Architecture

### Backend — Python (FastAPI)

Clean layered architecture with strict dependency direction: routes → services → repositories → database.

```
backend/
├── app/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── forecasts.py        # GET /api/forecasts
│   │   │   ├── actuals.py          # GET /api/actuals
│   │   │   ├── accuracy.py         # GET /api/accuracy
│   │   │   └── health.py           # GET /api/health
│   │   └── deps.py                 # Dependency injection (DB session factory)
│   ├── core/
│   │   ├── config.py               # Pydantic Settings (env-based)
│   │   └── database.py             # Async SQLAlchemy engine + session
│   ├── models/                     # SQLAlchemy ORM models
│   │   ├── wind_actual.py          # WindActual table
│   │   ├── wind_forecast.py        # WindForecast table
│   │   └── sync_log.py             # SyncLog table (tracks sync runs)
│   ├── schemas/                    # Pydantic request/response schemas
│   │   ├── forecast.py
│   │   ├── actual.py
│   │   └── accuracy.py
│   ├── services/                   # Business logic
│   │   ├── forecast_service.py     # Gate closure logic, latest forecast lookup
│   │   ├── actual_service.py       # Actuals retrieval and filtering
│   │   └── accuracy_engine.py      # MAE, RMSE, MAPE, bias, percentiles, distributions
│   ├── repositories/               # Data access (SQL queries)
│   │   ├── forecast_repo.py
│   │   └── actual_repo.py
│   ├── sync/                       # Data synchronization
│   │   ├── elexon_client.py        # HTTP client for BMRS API
│   │   └── sync_service.py         # Fetch + upsert logic with idempotency
│   └── main.py                     # App factory, CORS, lifespan events
├── alembic/                        # Database migrations
├── tests/
│   ├── unit/                       # Service + repository tests
│   ├── integration/                # API endpoint tests
│   └── conftest.py                 # Fixtures, test DB setup
├── alembic.ini
├── pyproject.toml
└── Dockerfile
```

#### Database schema

**wind_actuals**
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT PK | Auto-increment |
| start_time | TIMESTAMPTZ | Delivery period start |
| settlement_date | DATE | |
| settlement_period | SMALLINT | 1–48 |
| generation_mw | INTEGER | Actual generation |
| publish_time | TIMESTAMPTZ | When published by Elexon |
| created_at | TIMESTAMPTZ | Row insert time |
| **Unique constraint** | | (start_time) |
| **Index** | | (settlement_date) |

**wind_forecasts**
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT PK | Auto-increment |
| start_time | TIMESTAMPTZ | Target delivery period |
| generation_mw | INTEGER | Forecasted generation |
| publish_time | TIMESTAMPTZ | When this forecast run was created |
| created_at | TIMESTAMPTZ | Row insert time |
| **Unique constraint** | | (start_time, publish_time) |
| **Index** | | (publish_time) |
| **Index** | | (start_time) |

**sync_log**
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT PK | |
| dataset | VARCHAR(20) | "FUELHH" or "WINDFOR" |
| started_at | TIMESTAMPTZ | |
| completed_at | TIMESTAMPTZ | Null if failed |
| records_fetched | INTEGER | |
| records_upserted | INTEGER | |
| status | VARCHAR(20) | "success", "failed", "running" |
| error_message | TEXT | Null on success |

#### API endpoints

**GET /api/forecasts/latest-at-gate**
- Query params: `delivery_date` (YYYY-MM-DD)
- Returns: the latest forecast run published before 09:00 UTC on (delivery_date - 1), with all hourly forecast points for the delivery date
- Response: `{ publish_time, delivery_date, points: [{ start_time, generation_mw }] }`

**GET /api/forecasts/by-date**
- Query params: `delivery_date`, optional `publish_time_before`
- Returns: all forecast runs available for a delivery date

**GET /api/actuals/by-date**
- Query params: `date` (YYYY-MM-DD)
- Returns: all 48 settlement periods for that date
- Response: `{ date, points: [{ start_time, settlement_period, generation_mw }] }`

**GET /api/accuracy/summary**
- Query params: `from_date`, `to_date` (defaults to full January 2026)
- Returns: `{ mae, rmse, mape, bias, count }`

**GET /api/accuracy/daily**
- Query params: `from_date`, `to_date`
- Returns: `[{ date, mae, rmse, bias }]`

**GET /api/accuracy/distribution**
- Query params: `from_date`, `to_date`, `bin_width_mw` (default 250)
- Returns: `{ bins: [{ lower, upper, count }], percentiles: { p5, p25, p50, p75, p90, p95 } }`

**GET /api/accuracy/hourly**
- Query params: `from_date`, `to_date`
- Returns: `[{ hour: 0-23, mae, count }]`

**GET /api/accuracy/worst-cases**
- Query params: `from_date`, `to_date`, `limit` (default 10)
- Returns: `[{ date, hour, forecast_mw, actual_mw, error_mw, direction }]`

**GET /api/health**
- Returns: `{ status, last_sync, db_connected }`

**GET /api/sync/status**
- Returns: latest sync log entry

**POST /api/sync/trigger**
- Triggers a manual data sync from Elexon

#### Key backend patterns

- **Async everywhere:** asyncpg driver, async SQLAlchemy sessions, async httpx for Elexon calls
- **Dependency injection:** FastAPI `Depends()` for DB sessions, services, config
- **Upsert sync:** ON CONFLICT DO UPDATE ensures idempotent data loading
- **Accuracy engine:** Pure functions that take forecast/actual arrays and return metrics — fully unit-testable without DB
- **CORS:** Allow frontend origin in dev/prod via config
- **Error handling:** Custom exception classes, global exception handler middleware
- **Logging:** Structured JSON logging via structlog

### Frontend — React (Vite + TypeScript)

Clean architecture with three layers: data, domain, presentation.

```
frontend/
├── src/
│   ├── data/                         # DATA LAYER
│   │   ├── api/
│   │   │   ├── client.ts             # Axios instance with base URL, interceptors
│   │   │   ├── forecasts.api.ts      # getLatestAtGate(), getForecastsByDate()
│   │   │   ├── actuals.api.ts        # getActualsByDate()
│   │   │   └── accuracy.api.ts       # getSummary(), getDaily(), getDistribution(), etc.
│   │   ├── queries/
│   │   │   ├── useForecastsQuery.ts  # TanStack Query wrappers
│   │   │   ├── useActualsQuery.ts
│   │   │   └── useAccuracyQuery.ts
│   │   └── types/
│   │       ├── forecast.dto.ts       # API response shapes
│   │       ├── actual.dto.ts
│   │       └── accuracy.dto.ts
│   │
│   ├── domain/                       # BUSINESS LOGIC LAYER (no React in services)
│   │   ├── models/
│   │   │   ├── ForecastPoint.ts      # Domain model interfaces
│   │   │   ├── ActualPoint.ts
│   │   │   └── AccuracyMetrics.ts
│   │   ├── services/
│   │   │   ├── forecast.service.ts   # alignForecstToActuals(), getLatestBeforeGate()
│   │   │   ├── accuracy.service.ts   # Client-side metric helpers, formatting
│   │   │   └── formatting.service.ts # formatMW(), formatDelta(), formatTimestamp()
│   │   └── hooks/
│   │       ├── useDashboardData.ts   # Composes queries → dashboard view model
│   │       ├── useForecastExplorer.ts# Date selection + gate closure + chart data
│   │       └── useAccuracyReport.ts  # Aggregates all accuracy endpoints
│   │
│   ├── presentation/                 # UI LAYER (no business logic)
│   │   ├── layouts/
│   │   │   ├── AppLayout.tsx         # Sidebar + <Outlet/>
│   │   │   ├── Sidebar.tsx           # Nav items, brand, theme toggle, sync status
│   │   │   └── PageHeader.tsx        # Title, subtitle, action buttons
│   │   ├── components/
│   │   │   ├── charts/
│   │   │   │   ├── TimeSeriesChart.tsx    # Recharts: forecast vs actual overlay
│   │   │   │   ├── ErrorHistogram.tsx     # Recharts: error distribution bars
│   │   │   │   ├── DailyBarChart.tsx      # Recharts: daily MAE bars
│   │   │   │   ├── HourlyHeatmap.tsx      # CSS grid heatmap
│   │   │   │   └── SparkLine.tsx          # Tiny inline SVG sparkline
│   │   │   ├── cards/
│   │   │   │   ├── MetricCard.tsx         # Icon + label + value + delta + sparkline
│   │   │   │   ├── InfoPanel.tsx          # Contextual warning/info banners
│   │   │   │   └── KeyValueCard.tsx       # Metadata rows (label: value)
│   │   │   ├── filters/
│   │   │   │   ├── DatePicker.tsx         # Calendar date selector
│   │   │   │   ├── FilterChip.tsx         # Icon + label + value chip
│   │   │   │   └── FilterBar.tsx          # Horizontal filter row
│   │   │   ├── feedback/
│   │   │   │   ├── LoadingSkeleton.tsx    # Shimmer placeholder
│   │   │   │   ├── ErrorBoundary.tsx      # Graceful error display
│   │   │   │   └── EmptyState.tsx         # No data message
│   │   │   └── data-display/
│   │   │       ├── DataTable.tsx          # Sortable, hoverable table
│   │   │       ├── TabGroup.tsx           # Pill-style tab switcher
│   │   │       └── Badge.tsx              # Over/Under status tags
│   │   └── pages/
│   │       ├── DashboardPage.tsx          # Calls useDashboardData → renders cards + chart
│   │       ├── ForecastExplorerPage.tsx   # Calls useForecastExplorer → renders filters + chart + metadata
│   │       └── AccuracyReportPage.tsx     # Calls useAccuracyReport → renders tabs + metrics + charts + table
│   │
│   ├── shared/
│   │   ├── theme/
│   │   │   ├── ThemeProvider.tsx      # React context + Zustand store
│   │   │   ├── tokens.ts             # Color tokens, spacing scale
│   │   │   └── useTheme.ts           # Hook for toggle + current mode
│   │   ├── constants/
│   │   │   ├── routes.ts             # Route path constants
│   │   │   └── config.ts             # API base URL, gate closure hour, timezone
│   │   └── utils/
│   │       ├── date.utils.ts         # UK timezone conversion, settlement period mapping
│   │       └── number.utils.ts       # MW formatting, percentage rounding
│   │
│   ├── App.tsx                       # Router + QueryClientProvider + ThemeProvider
│   └── main.tsx
├── tailwind.config.ts
├── vite.config.ts
└── tsconfig.json
```

#### Key frontend patterns

- **Data layer** handles HTTP + caching only. No UI imports.
- **Domain layer** contains pure TypeScript business logic. Services are plain functions (no React). Hooks compose queries + services into view models.
- **Presentation layer** is purely visual. Components receive data via props, never call APIs directly. Pages are thin: they call one domain hook and render components.
- **Icons:** Lucide React — tree-shakeable, consistent 24x24 flat icons, 1.5px stroke. Import only what's used: `import { Wind, Target, BarChart3 } from 'lucide-react'`
- **Charts:** Recharts — React-native, composable, responsive. All charts receive data as props.
- **State:** Zustand for theme only. TanStack Query handles all server state (no Redux).
- **Loading states:** Every data-dependent component shows a shimmer skeleton while loading.
- **Error boundaries:** Each page wrapped in ErrorBoundary for graceful degradation.

---

## Pages

### 1. Dashboard

**Purpose:** At-a-glance overview for the procurement team arriving in the morning.

**Components:**
- **Header:** "Dashboard" title, "January 2026" subtitle, Refresh + Export buttons
- **Metric cards (3-column grid):**
  - Latest forecast: value in MW, delivery date, publish time, sparkline
  - Current actual generation: latest settlement period value, sparkline
  - Month-to-date MAE: value, delta vs previous period (green/red tag)
- **Forecast vs actual chart:** Recharts line chart showing the next delivery day's forecast overlaid with actuals. Blue solid line = forecast, green dashed = actual. Light blue area fill under forecast. Hourly x-axis (00:00–00:00), MW y-axis.

### 2. Forecast explorer

**Purpose:** Examine exactly what forecast was available at gate closure for any delivery date.

**Components:**
- **Header:** Title + subtitle
- **Filter bar (3 chips):**
  - Delivery date: calendar picker, defaults to tomorrow
  - Gate closure: fixed "09:00 UK time" display
  - Forecast run: shows the latest publishTime before gate, with accent highlight
- **Forecast vs actual chart:** Same style as dashboard but with semi-transparent error band between the two lines
- **Split metadata cards (2-column):**
  - Left: Forecast metadata (publish time, horizon, resolution, peak forecast)
  - Right: Day accuracy snapshot (MAE, max over/underforecast with times, direction bias)

### 3. Accuracy report

**Purpose:** Deep error analysis for quantifying forecast risk.

**Components:**
- **Header:** Title + subtitle, Export CSV button
- **Pill-style tabs:** Summary | Distribution | Time of day | Worst cases

**Summary tab:**
- Metric cards (4-column): MAE, RMSE, MAPE, Bias (bias value colored amber when positive = over-forecast)
- Split chart area: Daily MAE trend (bar chart, worst days highlighted in orange) + Error distribution histogram (orange bars)
- Info panel (warning banner): Insight about error clustering around gate closure hours

**Distribution tab:**
- Full-width histogram: forecast error in MW (x-axis) vs frequency (y-axis)
- Percentile summary row below: P5, P25, Median, P75, P95

**Time of day tab:**
- Heatmap: 24 columns (hours 0–23), intensity = MAE at that hour
- Color scale: light blue (low error) → dark blue (high error)
- Legend + hour labels

**Worst cases tab:**
- Sortable data table: Date, Hour, Forecast MW, Actual MW, Error MW, Direction
- Direction shown as colored badge (red "Under" / amber "Over")
- P90 and P95 values displayed in header

---

## Deployment

```
docker-compose.yml
├── postgres        # PostgreSQL 16, volume-mounted
├── backend         # Python 3.12, uvicorn, port 8000
├── frontend        # Node 20, Vite dev server / nginx for prod, port 3000
```

- **Development:** `docker compose up` starts all three services
- **Backend serves** at `http://localhost:8000/api/`
- **Frontend proxies** `/api/*` to backend via Vite proxy (dev) or nginx (prod)
- **Initial data load:** `POST /api/sync/trigger` or a CLI command `python -m app.sync.cli` to pull January 2026 data from Elexon on first startup
- **Environment variables:** `DATABASE_URL`, `ELEXON_BASE_URL`, `CORS_ORIGINS`, `GATE_CLOSURE_HOUR`

---

## Tech stack summary

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend framework | FastAPI | Async, auto-docs, Pydantic validation |
| ORM | SQLAlchemy 2.0 (async) | Industry standard, Alembic migrations |
| DB driver | asyncpg | Non-blocking PostgreSQL |
| HTTP client | httpx (async) | For Elexon API calls |
| Database | PostgreSQL 16 | Production-grade, complex query support |
| Frontend framework | React 18 + TypeScript | Type safety, component model |
| Build tool | Vite | Fast HMR, ESM-native |
| Routing | React Router v6 | Standard, nested layouts |
| Data fetching | TanStack Query v5 | Caching, deduplication, background refetch |
| Charts | Recharts | React-native, composable, responsive |
| Icons | Lucide React | Tree-shakeable flat icons, 1.5px stroke |
| Styling | Tailwind CSS | Utility-first, dark mode built-in |
| Theme state | Zustand | Minimal global state |
| Logging | structlog | Structured JSON logs |
| Containerization | Docker + Docker Compose | Reproducible dev/prod |

---

## Success criteria

1. User can see the latest wind forecast available at gate closure for any January 2026 delivery date
2. User can visually compare forecast vs actual generation on a time series chart
3. User can see MAE, RMSE, MAPE, and bias for the full month and per day
4. User can inspect error distribution with percentiles (P5, P25, P50, P75, P90, P95)
5. User can identify which hours of day have highest forecast errors
6. User can see the worst individual forecast errors ranked by magnitude
7. Theme toggle works (light/dark mode)
8. Data loads from Elexon BMRS API and persists in PostgreSQL
9. Application starts with a single `docker compose up`
