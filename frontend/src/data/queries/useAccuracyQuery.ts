import { useQuery } from "@tanstack/react-query";
import { fetchAccuracySummary, fetchDailyAccuracy, fetchDistribution, fetchHourlyAccuracy, fetchWorstCases } from "../api/accuracy.api";

export function useAccuracySummary() {
  return useQuery({ queryKey: ["accuracy", "summary"], queryFn: fetchAccuracySummary });
}

export function useDailyAccuracy() {
  return useQuery({ queryKey: ["accuracy", "daily"], queryFn: fetchDailyAccuracy });
}

export function useDistribution() {
  return useQuery({ queryKey: ["accuracy", "distribution"], queryFn: fetchDistribution });
}

export function useHourlyAccuracy() {
  return useQuery({ queryKey: ["accuracy", "hourly"], queryFn: fetchHourlyAccuracy });
}

export function useWorstCases() {
  return useQuery({ queryKey: ["accuracy", "worst-cases"], queryFn: fetchWorstCases });
}
