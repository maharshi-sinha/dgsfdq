import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Area, ComposedChart } from "recharts";
import type { ChartPoint } from "../../../domain/services/formatting.service";

interface TimeSeriesChartProps {
  data: ChartPoint[];
  showErrorBand?: boolean;
}

export function TimeSeriesChart({ data, showErrorBand = false }: TimeSeriesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--color-gray-400)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--color-gray-200)" }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--color-gray-400)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          width={40}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid var(--color-gray-200)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
          formatter={(value: number) => [`${value.toLocaleString()} MW`]}
        />
        {showErrorBand && (
          <Area type="monotone" dataKey="forecast" fill="rgba(42,120,214,0.06)" stroke="none" />
        )}
        <Line type="monotone" dataKey="forecast" stroke="#2a78d6" strokeWidth={2} dot={false} name="Forecast" />
        <Line type="monotone" dataKey="actual" stroke="#1baf7a" strokeWidth={2} dot={false} strokeDasharray="5 3" name="Actual" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
