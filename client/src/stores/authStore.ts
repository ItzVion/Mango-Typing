import { create } from "zustand";

type User = { id: string; username: string; email: string; avatarUrl?: string | null; hasDonated?: boolean } | null;

interface AuthState {
  user: User;
  setUser: (u: User) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (u) => set({ user: u }),
  login: (token, user) => {
    localStorage.setItem("vc_token", token);
    set({ user });
  },
  logout: () => {
    localStorage.removeItem("vc_token");
    set({ user: null });
  },
}));
