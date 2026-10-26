import { create } from "zustand";

type ThemeMode = "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
  toggle: () => void;
}

if (typeof document !== "undefined") {
  document.documentElement.classList.remove("dark");
}

export const useTheme = create<ThemeState>((set) => ({
  mode: "light" as ThemeMode,
  toggle: () =>
    set((state) => {
      const next = state.mode === "light" ? "dark" : "light";
      document.documentElement.classList.toggle("dark", next === "dark");
      return { mode: next };
    }),
}));
