import { apiClient } from "./client";
import type { ActualsByDateDTO } from "../types/actual.dto";

export async function fetchActualsByDate(date: string): Promise<ActualsByDateDTO> {
  const { data } = await apiClient.get<ActualsByDateDTO>("/actuals/by-date", {
    params: { date },
  });
  return data;
}
