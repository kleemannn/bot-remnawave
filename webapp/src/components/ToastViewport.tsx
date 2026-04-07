'use client';

import { useEffect } from 'react';
import { useUiStore } from '@/store/useUiStore';

export function ToastViewport() {
  const toast = useUiStore((state) => state.toast);
  const clearToast = useUiStore((state) => state.clearToast);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => clearToast(), 2200);
    return () => window.clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed left-1/2 top-5 z-50 w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2">
      <div className="rounded-2xl bg-tg-text px-4 py-3 text-sm font-medium text-[color:var(--tg-bg)] shadow-card">
        {toast.message}
      </div>
    </div>
  );
}
