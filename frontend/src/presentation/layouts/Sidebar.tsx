import { NavLink } from "react-router-dom";
import { LayoutDashboard, TrendingUp, Target, Wind, Sun, Moon } from "lucide-react";
import { useTheme } from "../../shared/theme/useTheme";
import { ROUTES } from "../../shared/constants/routes";

const navItems = [
  { to: ROUTES.DASHBOARD, label: "Dashboard", icon: LayoutDashboard },
  { to: ROUTES.FORECAST_EXPLORER, label: "Forecast explorer", icon: TrendingUp },
  { to: ROUTES.ACCURACY_REPORT, label: "Accuracy report", icon: Target },
];

export function Sidebar() {
  const { mode, toggle } = useTheme();

  return (
    <aside className="w-56 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
          <Wind className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">WindView</div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400">Forecast analytics</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 px-3 pb-2">
          Analytics
        </div>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-medium"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`
            }
          >
            <Icon className="w-[18px] h-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Data synced
        </div>
        <div className="flex items-center justify-between">
          <button onClick={toggle} className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            {mode === "light" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {mode === "light" ? "Light" : "Dark"}
          </button>
          <button
            onClick={toggle}
            className={`relative w-9 h-5 rounded-full transition-colors ${
              mode === "dark" ? "bg-blue-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                mode === "dark" ? "translate-x-4" : ""
              }`}
            />
          </button>
        </div>
      </div>
    </aside>
  );
}
