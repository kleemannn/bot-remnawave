'use client';

import { PropsWithChildren, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { bootstrapTelegramAuth } from '@/lib/auth';
import { applyTelegramTheme, expandTelegramWebApp } from '@/lib/telegram';
import { useUserStore } from '@/store/useUserStore';
import { BottomNav } from '@/components/BottomNav';
import { ToastViewport } from '@/components/ToastViewport';
import { Button } from '@/components/Button';

export function Providers({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const authStatus = useUserStore((state) => state.authStatus);
  const errorMessage = useUserStore((state) => state.errorMessage);
  const setAuthLoading = useUserStore((state) => state.setAuthLoading);
  const setSession = useUserStore((state) => state.setSession);
  const setAuthError = useUserStore((state) => state.setAuthError);
  const [showNav, setShowNav] = useState(false);

  useEffect(() => {
    setShowNav(
      pathname === '/dashboard' || pathname === '/subscriptions' || pathname === '/profile',
    );
  }, [pathname]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      applyTelegramTheme();
      expandTelegramWebApp();
    }, 50);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (authStatus !== 'idle') {
      return;
    }

    let active = true;
    setAuthLoading();
    bootstrapTelegramAuth()
      .then((session) => {
        if (!active) {
          return;
        }

        setSession({
          accessToken: session.accessToken,
          user: session.user,
          profile: session.profile,
        });
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setAuthError(error instanceof Error ? error.message : 'Не удалось открыть панель.');
      });

    return () => {
      active = false;
    };
  }, [authStatus, setAuthError, setAuthLoading, setSession]);

  if (authStatus === 'loading' || authStatus === 'idle') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] items-center justify-center px-6 text-center">
        <div className="space-y-3">
          <div className="mx-auto h-14 w-14 animate-pulse rounded-full bg-tg-muted" />
          <p className="text-base font-medium text-tg-text">Открываем панель…</p>
          <p className="text-sm text-tg-hint">Подключаем Telegram и загружаем ваши данные.</p>
        </div>
      </div>
    );
  }

  if (authStatus === 'error') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] items-center justify-center px-6 text-center">
        <div className="space-y-4 rounded-[28px] border border-tg-border bg-tg-card p-6 shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-tg-muted text-2xl">
            ⚠
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-tg-text">Панель недоступна</h1>
            <p className="text-sm leading-6 text-tg-hint">{errorMessage}</p>
          </div>
          <Button onClick={() => window.location.reload()}>Повторить</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastViewport />
      {children}
      {showNav ? <BottomNav /> : null}
    </>
  );
}
