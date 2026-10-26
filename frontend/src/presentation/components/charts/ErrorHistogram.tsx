import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import type { DistributionBinDTO } from "../../../data/types/accuracy.dto";

interface ErrorHistogramProps {
  bins: DistributionBinDTO[];
}

export function ErrorHistogram({ bins }: ErrorHistogramProps) {
  const data = bins.map((b) => ({
    range: `${b.lower >= 0 ? "+" : ""}${b.lower}`,
    count: b.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" vertical={false} />
        <XAxis
          dataKey="range"
          tick={{ fontSize: 9, fill: "var(--color-gray-400)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--color-gray-200)" }}
        />
        <YAxis tick={{ fontSize: 10, fill: "var(--color-gray-400)" }} tickLine={false} axisLine={false} width={30} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--color-gray-200)" }} />
        <Bar dataKey="count" fill="#eb6834" radius={[3, 3, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
