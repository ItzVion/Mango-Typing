import { create } from "zustand";

type User = { id: string; username: string; email: string; avatarUrl?: string | null; hasDonated?: boolean; isOwner?: boolean } | null;

interface AuthState {
  user: User;
  authInitialized: boolean;
  // True only when session restoration (`/auth/me` on boot) failed for a
  // reason other than "the token is genuinely invalid" (network blip, 500,
  // etc). Lets pages like /admin show a retry state instead of wrongly
  // treating the user as logged out.
  authError: boolean;
  setUser: (u: User) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  setAuthInitialized: (value: boolean) => void;
  setAuthError: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  authInitialized: false,
  authError: false,
  setUser: (u) => set({ user: u }),
  login: (token, user) => {
    localStorage.setItem("vc_token", token);
    set({ user, authError: false });
  },
  logout: () => {
    localStorage.removeItem("vc_token");
    set({ user: null, authInitialized: true, authError: false });
  },
  setAuthInitialized: (value) => set({ authInitialized: value }),
  setAuthError: (value) => set({ authError: value }),
}));
