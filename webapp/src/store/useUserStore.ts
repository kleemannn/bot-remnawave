'use client';

import { create } from 'zustand';
import { AuthUser, DealerProfile } from '@/lib/types';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error';

interface UserStoreState {
  authStatus: AuthStatus;
  accessToken: string | null;
  user: AuthUser | null;
  profile: DealerProfile | null;
  errorMessage: string | null;
  setAuthLoading: () => void;
  setSession: (payload: {
    accessToken: string;
    user: AuthUser;
    profile?: DealerProfile | null;
  }) => void;
  setProfile: (profile: DealerProfile) => void;
  setAuthError: (message: string) => void;
  clearSession: () => void;
}

export const useUserStore = create<UserStoreState>((set) => ({
  authStatus: 'idle',
  accessToken: null,
  user: null,
  profile: null,
  errorMessage: null,
  setAuthLoading: () =>
    set({
      authStatus: 'loading',
      errorMessage: null,
    }),
  setSession: ({ accessToken, user, profile }) =>
    set({
      authStatus: 'authenticated',
      accessToken,
      user,
      profile: profile ?? null,
      errorMessage: null,
    }),
  setProfile: (profile) =>
    set({
      profile,
    }),
  setAuthError: (message) =>
    set({
      authStatus: 'error',
      errorMessage: message,
    }),
  clearSession: () =>
    set({
      authStatus: 'idle',
      accessToken: null,
      user: null,
      profile: null,
      errorMessage: null,
    }),
}));
