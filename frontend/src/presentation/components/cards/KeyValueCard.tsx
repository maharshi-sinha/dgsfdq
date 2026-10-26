import type { LucideIcon } from "lucide-react";

interface KVRow {
  label: string;
  value: string;
  valueColor?: string;
}

interface KeyValueCardProps {
  title: string;
  icon?: LucideIcon;
  rows: KVRow[];
}

export function KeyValueCard({ title, icon: Icon, rows }: KeyValueCardProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-1.5">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        {title}
      </div>
      <table className="w-full text-xs">
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.label} className={i < rows.length - 1 ? "border-b border-gray-200 dark:border-gray-800" : ""}>
              <td className="text-gray-500 dark:text-gray-400 py-2 w-2/5">{row.label}</td>
              <td className={`py-2 tabular-nums ${row.valueColor || "text-gray-900 dark:text-gray-100"}`}>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
