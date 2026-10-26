import { useQuery } from "@tanstack/react-query";
import { fetchActualsByDate } from "../api/actuals.api";

export function useActualsByDate(date: string) {
  return useQuery({
    queryKey: ["actuals", "by-date", date],
    queryFn: () => fetchActualsByDate(date),
  });
}
