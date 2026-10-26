import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-blue-950 dark:to-emerald-950 border border-blue-100 dark:border-blue-900 flex items-center justify-center mb-5">
        <Icon className="w-7 h-7 text-blue-400 dark:text-blue-500" strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5">{title}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs leading-relaxed">{description}</p>
      <div className="mt-5 flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Waiting for data sync
      </div>
    </div>
  );
}
