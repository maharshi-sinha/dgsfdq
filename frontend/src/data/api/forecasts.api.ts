import { apiClient } from "./client";
import type { ForecastAtGateDTO } from "../types/forecast.dto";

export async function fetchForecastAtGate(deliveryDate: string): Promise<ForecastAtGateDTO> {
  const { data } = await apiClient.get<ForecastAtGateDTO>("/forecasts/latest-at-gate", {
    params: { delivery_date: deliveryDate },
  });
  return data;
}
