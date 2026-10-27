# WindView

A full-stack analytics platform for UK day-ahead wind generation procurement. WindView ingests national wind generation forecasts and actuals from the [Elexon BMRS API](https://bmrs.elexon.co.uk/), aligns them to the day-ahead gate closure window (09:00 UK time), and delivers forecast accuracy metrics that help energy traders make informed purchasing decisions.

Built for January 2026 data scope.

---

## Features

- **Dashboard** — At-a-glance view of the latest forecast, current generation, and month-to-date accuracy (MAE/MAPE) with an interactive forecast-vs-actual time series chart.
- **Forecast Explorer** — Date-selectable deep dive into individual day-ahead forecasts: curve visualization, metadata, peak generation, and error bands.
- **Accuracy Report** — Four-tab analysis suite:
  - **Summary** — MAE, RMSE, MAPE, bias metrics with daily trend and error distribution charts.
  - **Distribution** — Full error histogram with P5/P25/P50/P75/P95 percentile breakdowns.
  - **Time of Day** — Hourly heatmap revealing systematic forecast error patterns across the day.
  - **Worst Cases** — Ranked table of the largest forecast misses with direction classification.
- **Light / Dark Mode** — Toggle between themes with a single click. Defaults to light.
- **Graceful Empty States** — Informative placeholder UI when the backend is unavailable or data hasn't been synced.

---

## Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 19 + TypeScript 6 | UI framework |
| Vite 8 | Build tooling and HMR |
| Tailwind CSS 4 | Utility-first styling |
| TanStack Query 5 | Server state and caching |
| Recharts 3 | Interactive charts |
| Zustand 5 | Client state (theme) |
| Lucide React | Icon system |
| React Router 6 | Client-side routing |

### Backend

| Technology | Purpose |
|---|---|
| Python 3.12+ | Runtime |
| FastAPI | Async REST API |
| SQLAlchemy 2.0 (async) | ORM with asyncpg driver |
| PostgreSQL 16 | Persistent storage |
| Alembic | Database migrations |
| httpx | Async HTTP client for Elexon API |
| structlog | Structured logging |

### Infrastructure

| Technology | Purpose |
|---|---|
| Docker Compose | Multi-service orchestration |
| PostgreSQL Alpine | Lightweight database container |

---

## Architecture

```
frontend/src/
├── data/                   # API client, DTOs, TanStack Query hooks
│   ├── api/                # Axios-based API functions
│   ├── queries/            # React Query hook wrappers
│   └── types/              # TypeScript DTOs
├── domain/                 # Business logic layer
│   ├── hooks/              # Page-level data composition
│   └── services/           # Data transformation and formatting
├── presentation/           # UI layer
│   ├── components/         # Reusable components (cards, charts, feedback)
│   ├── layouts/            # App shell, sidebar, page header
│   └── pages/              # Route-level page components
└── shared/                 # Cross-cutting concerns
    ├── constants/          # App config, route definitions
    ├── theme/              # Theme store and provider
    └── utils/              # Formatting utilities

backend/app/
├── api/                    # FastAPI route handlers
│   └── routes/             # Endpoint modules (forecasts, actuals, accuracy, health)
├── core/                   # Config and database engine
├── models/                 # SQLAlchemy ORM models
├── repositories/           # Data access layer
├── schemas/                # Pydantic request/response schemas
├── services/               # Business logic (accuracy engine, sync orchestration)
└── sync/                   # Elexon BMRS API client and data sync
```

---

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.12+ (for local backend development)

### Quick Start (Docker)

```bash
# Clone the repository
git clone https://github.com/maharshi-sinha/dgsfdq.git
cd dgsfdq

# Start all services
docker compose up -d

# Run database migrations
docker compose exec backend alembic upgrade head

# Trigger initial data sync (fetches January 2026 data from Elexon)
curl -X POST http://localhost:8000/api/sync/trigger

# Open the app
open http://localhost:3000
```

### Local Development

**Backend:**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Copy and configure environment
cp .env.example .env

# Run migrations (requires PostgreSQL)
alembic upgrade head

# Start the dev server
uvicorn app.main:app --reload --port 8000
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server starts at `http://localhost:3000` with hot module replacement. API requests are proxied to `http://localhost:8000`.

---

## API Endpoints

All frontend endpoint paths are centralized in [`frontend/src/data/api/endpoints.ts`](frontend/src/data/api/endpoints.ts).

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/forecasts/latest-at-gate?delivery_date=YYYY-MM-DD` | Latest forecast available at gate closure |
| `GET` | `/api/actuals/by-date?date=YYYY-MM-DD` | Half-hourly actual generation for a date |
| `GET` | `/api/accuracy/summary?from_date=...&to_date=...` | Aggregate accuracy metrics |
| `GET` | `/api/accuracy/daily?from_date=...&to_date=...` | Daily MAE breakdown |
| `GET` | `/api/accuracy/distribution?from_date=...&to_date=...` | Error distribution with percentiles |
| `GET` | `/api/accuracy/hourly?from_date=...&to_date=...` | Mean error by hour of day |
| `GET` | `/api/accuracy/worst-cases?from_date=...&to_date=...` | Top forecast misses |
| `POST` | `/api/sync/trigger` | Trigger data sync from Elexon BMRS |

---

## Testing

```bash
# Backend unit tests
cd backend
pytest -v

# Frontend type check
cd frontend
npx tsc --noEmit

# Frontend lint
cd frontend
npm run lint
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string (asyncpg) |
| `ELEXON_BASE_URL` | `https://data.elexon.co.uk/bmrs/api/v1` | Elexon BMRS API base URL |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins |
| `GATE_CLOSURE_HOUR` | `9` | Day-ahead gate closure hour (UK time) |

---

## License

This project is provided as-is for educational and demonstration purposes.
