import { create } from "zustand";

type ThemeMode = "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
  toggle: () => void;
}

export const useTheme = create<ThemeState>((set) => ({
  mode: (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light",
  toggle: () =>
    set((state) => {
      const next = state.mode === "light" ? "dark" : "light";
      document.documentElement.classList.toggle("dark", next === "dark");
      return { mode: next };
    }),
}));
