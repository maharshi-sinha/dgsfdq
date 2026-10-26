import { AlertTriangle, Info } from "lucide-react";
import type { ReactNode } from "react";

interface InfoPanelProps {
  variant: "warning" | "info";
  children: ReactNode;
}

export function InfoPanel({ variant, children }: InfoPanelProps) {
  const styles = {
    warning: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
    info: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
  };
  const Icon = variant === "warning" ? AlertTriangle : Info;

  return (
    <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs ${styles[variant]}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      {children}
    </div>
  );
}
