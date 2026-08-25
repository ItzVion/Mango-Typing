import { create } from "zustand";

type Theme = "light" | "dark";

function applyTheme(t: Theme) {
  document.documentElement.classList.toggle("dark", t === "dark");
}

const initial: Theme = (localStorage.getItem("vc_theme") as Theme) || "light";
applyTheme(initial);

interface ThemeState {
  theme: Theme;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initial,
  toggle: () => {
    const next: Theme = get().theme === "light" ? "dark" : "light";
    localStorage.setItem("vc_theme", next);
    applyTheme(next);
    set({ theme: next });
  },
}));
