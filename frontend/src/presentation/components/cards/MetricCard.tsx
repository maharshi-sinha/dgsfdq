import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  icon: LucideIcon;
  iconColor?: "blue" | "green" | "amber";
  label: string;
  value: string;
  subtitle?: string;
  tag?: ReactNode;
}

const iconBg = {
  blue: "bg-blue-50 dark:bg-blue-950 text-blue-500",
  green: "bg-emerald-50 dark:bg-emerald-950 text-emerald-500",
  amber: "bg-amber-50 dark:bg-amber-950 text-amber-500",
};

export function MetricCard({ icon: Icon, iconColor = "blue", label, value, subtitle, tag }: MetricCardProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 hover:ring-1 hover:ring-gray-200 dark:hover:ring-gray-700 transition-shadow">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${iconBg[iconColor]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-medium text-gray-900 dark:text-gray-100 tabular-nums">{value}</div>
      {subtitle && <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{subtitle}</div>}
      {tag}
    </div>
  );
}
