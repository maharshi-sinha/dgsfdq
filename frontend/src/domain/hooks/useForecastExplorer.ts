import { useState } from "react";
import { useForecastAtGate } from "../../data/queries/useForecastsQuery";
import { useActualsByDate } from "../../data/queries/useActualsQuery";
import { alignForecastAndActuals } from "../services/formatting.service";
import { APP_CONFIG } from "../../shared/constants/config";

export function useForecastExplorer() {
  const [deliveryDate, setDeliveryDate] = useState<string>(APP_CONFIG.DEFAULT_DELIVERY_DATE);

  const forecast = useForecastAtGate(deliveryDate);
  const actuals = useActualsByDate(deliveryDate);

  const chartData =
    forecast.data && actuals.data
      ? alignForecastAndActuals(forecast.data.points, actuals.data.points)
      : [];

  const peakForecast = forecast.data
    ? forecast.data.points.reduce<{ generation_mw: number; start_time: string } | null>(
        (peak, point) => (!peak || point.generation_mw > peak.generation_mw ? point : peak),
        null,
      )
    : null;

  return {
    deliveryDate,
    setDeliveryDate,
    isLoading: forecast.isLoading || actuals.isLoading,
    forecast: forecast.data ?? null,
    chartData,
    peakForecast,
  };
}
