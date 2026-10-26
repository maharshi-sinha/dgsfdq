import { useEffect, type ReactNode } from "react";
import { useTheme } from "./useTheme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useTheme((s) => s.mode);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, [mode]);

  return <>{children}</>;
}
