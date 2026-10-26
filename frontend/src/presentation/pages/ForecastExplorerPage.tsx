import { Calendar, Clock, Activity, FileText, Target, TrendingUp } from "lucide-react";
import { PageHeader } from "../layouts/PageHeader";
import { TimeSeriesChart } from "../components/charts/TimeSeriesChart";
import { KeyValueCard } from "../components/cards/KeyValueCard";
import { LoadingSkeleton } from "../components/feedback/LoadingSkeleton";
import { EmptyState } from "../components/feedback/EmptyState";
import { useForecastExplorer } from "../../domain/hooks/useForecastExplorer";
import { formatMW } from "../../shared/utils/number.utils";
import { formatDate, formatTime } from "../../shared/utils/date.utils";

export function ForecastExplorerPage() {
  const { deliveryDate, setDeliveryDate, isLoading, forecast, chartData, peakForecast } =
    useForecastExplorer();

  return (
    <div>
      <PageHeader title="Forecast explorer" subtitle="Examine the forecast available at day-ahead gate closure" />

      <div className="flex gap-2.5 mb-5 flex-wrap">
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <div>
            <div className="text-[10px] text-gray-400">Delivery date</div>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              min="2026-01-01"
              max="2026-01-31"
              className="text-xs font-medium bg-transparent text-gray-900 dark:text-gray-100 outline-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <div>
            <div className="text-[10px] text-gray-400">Gate closure</div>
            <div className="text-xs font-medium text-gray-900 dark:text-gray-100">09:00 UK time</div>
          </div>
        </div>
        {forecast && (
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
            <Activity className="w-3.5 h-3.5 text-blue-500" />
            <div>
              <div className="text-[10px] text-gray-400">Forecast run</div>
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400">{formatTime(forecast.publish_time)} (latest)</div>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton className="h-64 mb-3" />
      ) : !forecast ? (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
          <EmptyState
            icon={TrendingUp}
            title="No forecast data available"
            description="No wind generation forecast found for this delivery date. Sync data from the Elexon BMRS API to view forecast curves and metadata."
          />
        </div>
      ) : (
        <>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Forecast vs actual generation</span>
              <div className="flex gap-3 text-[11px] text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-2 h-[3px] rounded bg-blue-500" /> Forecast</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-[3px] rounded bg-emerald-500" /> Actual</span>
                <span className="flex items-center gap-1.5"><span className="w-4 h-[3px] rounded bg-blue-500/20" /> Error band</span>
              </div>
            </div>
            <TimeSeriesChart data={chartData} showErrorBand />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <KeyValueCard
              title="Forecast metadata"
              icon={FileText}
              rows={[
                { label: "Published", value: `${formatDate(forecast.publish_time)}, ${formatTime(forecast.publish_time)} UTC` },
                { label: "Horizon", value: "14 – 38 hours ahead" },
                { label: "Resolution", value: `1 hour (${forecast.points.length} periods)` },
                { label: "Peak forecast", value: peakForecast ? `${formatMW(peakForecast.generation_mw)} MW at ${formatTime(peakForecast.start_time)}` : "—" },
              ]}
            />
            <KeyValueCard
              title="Day accuracy snapshot"
              icon={Target}
              rows={[
                { label: "MAE", value: "Computed from actuals" },
                { label: "Max overforecast", value: "—" },
                { label: "Max underforecast", value: "—" },
                { label: "Direction", value: "—" },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}
