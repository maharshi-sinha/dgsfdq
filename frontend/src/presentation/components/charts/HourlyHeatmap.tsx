import type { HourlyAccuracyDTO } from "../../../data/types/accuracy.dto";

interface HourlyHeatmapProps {
  data: HourlyAccuracyDTO[];
}

export function HourlyHeatmap({ data }: HourlyHeatmapProps) {
  const maxMae = Math.max(...data.map((d) => d.mae), 1);

  return (
    <div>
      <div className="grid grid-cols-[repeat(24,1fr)] gap-0.5">
        {Array.from({ length: 24 }, (_, hour) => {
          const point = data.find((d) => d.hour === hour);
          const intensity = point ? point.mae / maxMae : 0;
          const bg = `rgba(42, 120, 214, ${(intensity * 0.85 + 0.05).toFixed(2)})`;
          const textColor = intensity > 0.5 ? "text-white" : "text-gray-500 dark:text-gray-400";

          return (
            <div
              key={hour}
              className={`h-11 rounded flex items-end justify-center pb-1 ${textColor}`}
              style={{ background: bg }}
              title={`${hour}:00 — MAE: ${point ? Math.round(point.mae) : 0} MW`}
            >
              <span className="text-[8px]">{hour}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-3 text-[11px] text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1"><span className="w-3.5 h-2.5 rounded-sm" style={{ background: "rgba(42,120,214,0.1)" }} /> Low</span>
        <span className="flex items-center gap-1"><span className="w-3.5 h-2.5 rounded-sm" style={{ background: "rgba(42,120,214,0.5)" }} /> Medium</span>
        <span className="flex items-center gap-1"><span className="w-3.5 h-2.5 rounded-sm" style={{ background: "rgba(42,120,214,0.9)" }} /> High</span>
      </div>
    </div>
  );
}
