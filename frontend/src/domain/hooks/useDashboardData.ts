import { useForecastAtGate } from "../../data/queries/useForecastsQuery";
import { useActualsByDate } from "../../data/queries/useActualsQuery";
import { useAccuracySummary } from "../../data/queries/useAccuracyQuery";
import { alignForecastAndActuals } from "../services/formatting.service";
import { APP_CONFIG } from "../../shared/constants/config";

export function useDashboardData() {
  const forecast = useForecastAtGate(APP_CONFIG.DEFAULT_DELIVERY_DATE);
  const actuals = useActualsByDate(APP_CONFIG.DEFAULT_DELIVERY_DATE);
  const accuracy = useAccuracySummary();

  const chartData =
    forecast.data && actuals.data
      ? alignForecastAndActuals(forecast.data.points, actuals.data.points)
      : [];

  const latestActual = actuals.data?.points?.at(-1) ?? null;

  const settled = !forecast.isLoading && !actuals.isLoading && !accuracy.isLoading;
  const anyError = forecast.isError || actuals.isError || accuracy.isError;

  return {
    isLoading: !settled && !anyError,
    forecast: forecast.data ?? null,
    latestActual,
    accuracy: accuracy.data ?? null,
    chartData,
  };
}
