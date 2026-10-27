import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";
import type { AccuracySummaryDTO, DailyAccuracyDTO, DistributionDTO, HourlyAccuracyDTO, WorstCaseDTO } from "../types/accuracy.dto";

const DEFAULT_PARAMS = { from_date: "2026-01-01", to_date: "2026-01-31" };

export async function fetchAccuracySummary(): Promise<AccuracySummaryDTO> {
  const { data } = await apiClient.get<AccuracySummaryDTO>(ENDPOINTS.ACCURACY.SUMMARY, { params: DEFAULT_PARAMS });
  return data;
}

export async function fetchDailyAccuracy(): Promise<DailyAccuracyDTO[]> {
  const { data } = await apiClient.get<DailyAccuracyDTO[]>(ENDPOINTS.ACCURACY.DAILY, { params: DEFAULT_PARAMS });
  return data;
}

export async function fetchDistribution(): Promise<DistributionDTO> {
  const { data } = await apiClient.get<DistributionDTO>(ENDPOINTS.ACCURACY.DISTRIBUTION, { params: DEFAULT_PARAMS });
  return data;
}

export async function fetchHourlyAccuracy(): Promise<HourlyAccuracyDTO[]> {
  const { data } = await apiClient.get<HourlyAccuracyDTO[]>(ENDPOINTS.ACCURACY.HOURLY, { params: DEFAULT_PARAMS });
  return data;
}

export async function fetchWorstCases(): Promise<WorstCaseDTO[]> {
  const { data } = await apiClient.get<WorstCaseDTO[]>(ENDPOINTS.ACCURACY.WORST_CASES, { params: DEFAULT_PARAMS });
  return data;
}
