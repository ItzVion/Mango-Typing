import { create } from "zustand";

type Theme = "dark";

function applyTheme() {
  document.documentElement.classList.add("dark");
}

applyTheme();

interface ThemeState {
  theme: Theme;
}

export const useThemeStore = create<ThemeState>(() => ({
  theme: "dark",
}));
