import { useState } from "react";
import { Download } from "lucide-react";
import { PageHeader } from "../layouts/PageHeader";
import { MetricCard } from "../components/cards/MetricCard";
import { TabGroup } from "../components/data-display/TabGroup";
import { DataTable } from "../components/data-display/DataTable";
import { Badge } from "../components/data-display/Badge";
import { InfoPanel } from "../components/cards/InfoPanel";
import { ErrorHistogram } from "../components/charts/ErrorHistogram";
import { DailyBarChart } from "../components/charts/DailyBarChart";
import { HourlyHeatmap } from "../components/charts/HourlyHeatmap";
import { LoadingSkeleton } from "../components/feedback/LoadingSkeleton";
import { useAccuracyReport } from "../../domain/hooks/useAccuracyReport";
import { formatMW, formatDelta, formatPercent } from "../../shared/utils/number.utils";
import { Activity, TrendingUp, Target, BarChart3 } from "lucide-react";
import type { WorstCaseDTO } from "../../data/types/accuracy.dto";

const TABS = ["Summary", "Distribution", "Time of day", "Worst cases"];

export function AccuracyReportPage() {
  const [activeTab, setActiveTab] = useState("Summary");
  const { isLoading, summary, daily, distribution, hourly, worstCases } = useAccuracyReport();

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Accuracy report" subtitle="January 2026 — forecast error analysis" />
        <LoadingSkeleton className="h-96" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Accuracy report"
        subtitle="January 2026 — forecast error analysis across all settlement periods"
        actions={
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        }
      />

      <TabGroup tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === "Summary" && summary && (
        <>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <MetricCard icon={Activity} label="MAE" value={`${formatMW(summary.mae)} MW`} subtitle="Mean absolute error" />
            <MetricCard icon={TrendingUp} label="RMSE" value={`${formatMW(summary.rmse)} MW`} subtitle="Root mean square" />
            <MetricCard icon={Target} label="MAPE" value={formatPercent(summary.mape)} subtitle="Percentage error" />
            <MetricCard icon={BarChart3} iconColor="amber" label="Bias" value={formatDelta(summary.bias)} subtitle={summary.bias > 0 ? "Systematic over-forecast" : "Systematic under-forecast"} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Daily MAE trend</div>
              {daily && <DailyBarChart data={daily} />}
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Error distribution (MW)</div>
              {distribution && <ErrorHistogram bins={distribution.bins} />}
            </div>
          </div>

          <div className="mt-3">
            <InfoPanel variant="warning">
              Highest errors cluster around 08:00–11:00 (gate closure window). Consider applying a bias correction when procuring.
            </InfoPanel>
          </div>
        </>
      )}

      {activeTab === "Distribution" && distribution && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
          <div className="flex justify-between mb-3">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Forecast error histogram</span>
            <span className="text-[11px] text-gray-400">n = {summary?.count ?? 0} periods</span>
          </div>
          <ErrorHistogram bins={distribution.bins} />
          <div className="flex gap-5 mt-4 pt-3 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500">
            <span>P5: <b className="text-gray-900 dark:text-gray-100">{formatMW(distribution.percentiles.p5)} MW</b></span>
            <span>P25: <b className="text-gray-900 dark:text-gray-100">{formatMW(distribution.percentiles.p25)} MW</b></span>
            <span>Median: <b className="text-gray-900 dark:text-gray-100">{formatMW(distribution.percentiles.p50)} MW</b></span>
            <span>P75: <b className="text-gray-900 dark:text-gray-100">{formatMW(distribution.percentiles.p75)} MW</b></span>
            <span>P95: <b className="text-gray-900 dark:text-gray-100">{formatMW(distribution.percentiles.p95)} MW</b></span>
          </div>
        </div>
      )}

      {activeTab === "Time of day" && hourly && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">Mean absolute error by hour of day</div>
          <HourlyHeatmap data={hourly} />
        </div>
      )}

      {activeTab === "Worst cases" && worstCases && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Worst forecast errors</span>
            {distribution && (
              <span className="text-[11px] text-gray-400">
                P90: {formatMW(distribution.percentiles.p90)} MW · P95: {formatMW(distribution.percentiles.p95)} MW
              </span>
            )}
          </div>
          <DataTable<WorstCaseDTO>
            columns={[
              { key: "date", header: "Date", render: (r) => r.date.slice(5) },
              { key: "hour", header: "Hour", render: (r) => `${String(r.hour).padStart(2, "0")}:00` },
              { key: "forecast", header: "Forecast", render: (r) => `${formatMW(r.forecast_mw)} MW` },
              { key: "actual", header: "Actual", render: (r) => `${formatMW(r.actual_mw)} MW` },
              {
                key: "error",
                header: "Error",
                render: (r) => (
                  <span className={`font-medium ${r.error_mw > 0 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                    {formatDelta(r.error_mw)}
                  </span>
                ),
              },
              { key: "dir", header: "Direction", render: (r) => <Badge variant={r.direction === "over" ? "over" : "under"}>{r.direction === "over" ? "Over" : "Under"}</Badge> },
            ]}
            data={worstCases}
          />
        </div>
      )}
    </div>
  );
}
