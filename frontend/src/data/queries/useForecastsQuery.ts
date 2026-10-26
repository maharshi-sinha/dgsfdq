import { useQuery } from "@tanstack/react-query";
import { fetchForecastAtGate } from "../api/forecasts.api";

export function useForecastAtGate(deliveryDate: string) {
  return useQuery({
    queryKey: ["forecast", "at-gate", deliveryDate],
    queryFn: () => fetchForecastAtGate(deliveryDate),
  });
}
