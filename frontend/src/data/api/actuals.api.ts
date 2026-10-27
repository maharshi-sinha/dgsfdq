import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";
import type { ActualsByDateDTO } from "../types/actual.dto";

export async function fetchActualsByDate(date: string): Promise<ActualsByDateDTO> {
  const { data } = await apiClient.get<ActualsByDateDTO>(ENDPOINTS.ACTUALS.BY_DATE, {
    params: { date },
  });
  return data;
}
