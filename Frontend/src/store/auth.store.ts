import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { queryClient } from '@/app/providers/QueryProvider';
import type { AuthenticatedUser, TokenPair } from '@/types/auth.types';

interface AuthState {
  user: AuthenticatedUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (user: AuthenticatedUser, tokens: TokenPair) => void;
  setAccessToken: (accessToken: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: (user, tokens) => {
        // A previous session's cached queries (dashboard KPIs, "me", lists)
        // must not leak into this one — query keys aren't user-scoped, so
        // without this a fast account switch in the same tab would render
        // with stale data from whoever was signed in a moment ago.
        queryClient.clear();
        set({ user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      },
      setAccessToken: (accessToken) => set({ accessToken }),
      clear: () => {
        queryClient.clear();
        set({ user: null, accessToken: null, refreshToken: null });
      },
    }),
    { name: 'ares-auth' },
  ),
);
