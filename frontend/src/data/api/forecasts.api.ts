import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";
import type { ForecastAtGateDTO } from "../types/forecast.dto";

export async function fetchForecastAtGate(deliveryDate: string): Promise<ForecastAtGateDTO> {
  const { data } = await apiClient.get<ForecastAtGateDTO>(ENDPOINTS.FORECASTS.LATEST_AT_GATE, {
    params: { delivery_date: deliveryDate },
  });
  return data;
}
