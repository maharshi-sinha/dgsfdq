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
  direction: "over" | "under";
}
