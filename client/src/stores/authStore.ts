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
  // VC-cookie-migration: session lives entirely in the httpOnly vc_auth
  // cookie now — the server sets/clears it, this store just holds the user
  // object for UI state. No token is ever handled client-side.
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
    // Best-effort: clear the server-side cookie. Even if this call fails
    // (offline etc.), the UI still treats the session as ended.
    fetch(`${window.location.origin}/api/auth/logout`, { method: "POST" }).catch(() => {});
  },
  setAuthInitialized: (value) => set({ authInitialized: value }),
  setAuthError: (value) => set({ authError: value }),
}));
