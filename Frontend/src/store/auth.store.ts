import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
      setSession: (user, tokens) =>
        set({ user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      setAccessToken: (accessToken) => set({ accessToken }),
      clear: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'ares-auth' },
  ),
);
