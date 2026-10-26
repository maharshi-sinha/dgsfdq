import { Activity, Zap, Target, RefreshCw, Download } from "lucide-react";
import { PageHeader } from "../layouts/PageHeader";
import { MetricCard } from "../components/cards/MetricCard";
import { TimeSeriesChart } from "../components/charts/TimeSeriesChart";
import { LoadingSkeleton } from "../components/feedback/LoadingSkeleton";
import { useDashboardData } from "../../domain/hooks/useDashboardData";
import { formatMW, formatPercent } from "../../shared/utils/number.utils";
import { formatDate, formatTime } from "../../shared/utils/date.utils";

export function DashboardPage() {
  const { isLoading, forecast, latestActual, accuracy, chartData } = useDashboardData();

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="January 2026 — wind generation overview" />
        <div className="grid grid-cols-3 gap-3 mb-5"><LoadingSkeleton className="h-32" /><LoadingSkeleton className="h-32" /><LoadingSkeleton className="h-32" /></div>
        <LoadingSkeleton className="h-72" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="January 2026 — wind generation overview for day-ahead procurement"
        actions={
          <>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </>
        }
      />

      <div className="grid grid-cols-3 gap-3 mb-5">
        <MetricCard
          icon={Activity}
          iconColor="blue"
          label="Latest forecast"
          value={forecast ? `${formatMW(forecast.points[0]?.generation_mw ?? 0)} MW` : "—"}
          subtitle={forecast ? `For ${formatDate(forecast.delivery_date)}, pub ${formatTime(forecast.publish_time)}` : undefined}
        />
        <MetricCard
          icon={Zap}
          iconColor="green"
          label="Current generation"
          value={latestActual ? `${formatMW(latestActual.generation_mw)} MW` : "—"}
          subtitle={latestActual ? `${formatTime(latestActual.start_time)} settlement` : undefined}
        />
        <MetricCard
          icon={Target}
          iconColor="amber"
          label="Month-to-date MAE"
          value={accuracy ? `${formatMW(accuracy.mae)} MW` : "—"}
          tag={
            <span className="inline-flex items-center gap-1 text-[10px] mt-1.5 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-medium">
              MAPE {accuracy ? formatPercent(accuracy.mape) : "—"}
            </span>
          }
        />
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Forecast vs actual — {forecast ? formatDate(forecast.delivery_date) : ""}
          </span>
          <div className="flex gap-3 text-[11px] text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-[3px] rounded bg-blue-500" /> Forecast</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-[3px] rounded bg-emerald-500" /> Actual</span>
          </div>
        </div>
        <TimeSeriesChart data={chartData} />
      </div>
    </div>
  );
}
