import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./shared/theme/ThemeProvider";
import { AppLayout } from "./presentation/layouts/AppLayout";
import { DashboardPage } from "./presentation/pages/DashboardPage";
import { ForecastExplorerPage } from "./presentation/pages/ForecastExplorerPage";
import { AccuracyReportPage } from "./presentation/pages/AccuracyReportPage";
import { ROUTES } from "./shared/constants/routes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
              <Route path={ROUTES.FORECAST_EXPLORER} element={<ForecastExplorerPage />} />
              <Route path={ROUTES.ACCURACY_REPORT} element={<AccuracyReportPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
