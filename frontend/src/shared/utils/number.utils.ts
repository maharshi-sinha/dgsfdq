export function formatMW(value: number): string {
  return Math.round(value).toLocaleString("en-GB");
}

export function formatDelta(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${Math.round(value).toLocaleString("en-GB")} MW`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
