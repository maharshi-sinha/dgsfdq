import type { ForecastPointDTO } from "../../data/types/forecast.dto";
import type { ActualPointDTO } from "../../data/types/actual.dto";

export interface ChartPoint {
  label: string;
  forecast: number | null;
  actual: number | null;
}

export function alignForecastAndActuals(
  forecasts: ForecastPointDTO[],
  actuals: ActualPointDTO[],
): ChartPoint[] {
  const actualByHour = new Map<string, number>();
  for (const a of actuals) {
    const hour = a.start_time.slice(11, 13);
    if (!actualByHour.has(hour)) {
      actualByHour.set(hour, a.generation_mw);
    } else {
      actualByHour.set(hour, (actualByHour.get(hour)! + a.generation_mw) / 2);
    }
  }

  return forecasts.map((f) => {
    const hour = f.start_time.slice(11, 13);
    return {
      label: `${hour}:00`,
      forecast: f.generation_mw,
      actual: actualByHour.get(hour) ?? null,
    };
  });
}
