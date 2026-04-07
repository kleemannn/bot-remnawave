'use client';

import { create } from 'zustand';

interface ToastState {
  id: number;
  message: string;
}

interface UiStoreState {
  toast: ToastState | null;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useUiStore = create<UiStoreState>((set) => ({
  toast: null,
  showToast: (message) =>
    set({
      toast: {
        id: Date.now(),
        message,
      },
    }),
  clearToast: () => set({ toast: null }),
}));
