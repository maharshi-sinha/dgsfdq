import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import type { DailyAccuracyDTO } from "../../../data/types/accuracy.dto";

interface DailyBarChartProps {
  data: DailyAccuracyDTO[];
  highlightThreshold?: number;
}

export function DailyBarChart({ data, highlightThreshold }: DailyBarChartProps) {
  const threshold = highlightThreshold ?? (data.length ? Math.max(...data.map((d) => d.mae)) * 0.85 : Infinity);

  const chartData = data.map((d) => ({
    date: d.date.slice(5),
    mae: Math.round(d.mae),
  }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--color-gray-400)" }} tickLine={false} axisLine={{ stroke: "var(--color-gray-200)" }} />
        <YAxis tick={{ fontSize: 10, fill: "var(--color-gray-400)" }} tickLine={false} axisLine={false} width={35} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--color-gray-200)" }} />
        <Bar dataKey="mae" radius={[3, 3, 0, 0]} maxBarSize={12}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.mae >= threshold ? "#eb6834" : "#2a78d6"} opacity={entry.mae >= threshold ? 0.9 : 0.7} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
