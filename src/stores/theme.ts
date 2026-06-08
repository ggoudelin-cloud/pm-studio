"use client";

import { create } from "zustand";

export type Theme = "dark" | "light";

const STORAGE_KEY = "pm-theme";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("light", theme === "light");
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "dark",
  setTheme: (theme) => {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* rien */ }
    applyTheme(theme);
    set({ theme });
  },
}));
