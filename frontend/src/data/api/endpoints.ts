export const ENDPOINTS = {
  FORECASTS: {
    LATEST_AT_GATE: "/forecasts/latest-at-gate",
  },
  ACTUALS: {
    BY_DATE: "/actuals/by-date",
  },
  ACCURACY: {
    SUMMARY: "/accuracy/summary",
    DAILY: "/accuracy/daily",
    DISTRIBUTION: "/accuracy/distribution",
    HOURLY: "/accuracy/hourly",
    WORST_CASES: "/accuracy/worst-cases",
  },
  SYNC: {
    TRIGGER: "/sync/trigger",
  },
  HEALTH: "/health",
} as const;
