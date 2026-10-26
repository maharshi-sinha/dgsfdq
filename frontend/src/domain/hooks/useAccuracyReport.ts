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
