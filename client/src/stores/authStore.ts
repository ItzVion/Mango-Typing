import { create } from "zustand";
import { api } from "../api/client";

type User = { id: string; username: string; email: string; avatarUrl?: string | null; hasDonated?: boolean; isOwner?: boolean } | null;

interface AuthState {
  user: User;
  authInitialized: boolean;
  authError: boolean;
  setUser: (u: User) => void;
  login: (user: User) => void;
  logout: () => void;
  setAuthInitialized: (value: boolean) => void;
  setAuthError: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  authInitialized: false,
  authError: false,
  setUser: (u) => set({ user: u }),
  login: (user) => {
    set({ user, authError: false });
  },
  logout: () => {
    set({ user: null, authInitialized: true, authError: false });
    // Centralized API client obtains/sends the CSRF token before this
    // state-changing request. The UI still logs out immediately if offline.
    void api.logout().catch(() => {});
  },
  setAuthInitialized: (value) => set({ authInitialized: value }),
  setAuthError: (value) => set({ authError: value }),
}));
