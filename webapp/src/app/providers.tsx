'use client';

import { PropsWithChildren, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { bootstrapTelegramAuth } from '@/lib/auth';
import {
  applyTelegramTheme,
  expandTelegramWebApp,
  getTelegramInitData,
  getTelegramWebApp,
} from '@/lib/telegram';
import { useUserStore } from '@/store/useUserStore';
import { BottomNav } from '@/components/BottomNav';
import { ToastViewport } from '@/components/ToastViewport';
import { Button } from '@/components/Button';

interface AuthDebugState {
  visible: boolean;
  hasTelegram: boolean;
  initDataLength: number;
  readyState: string;
}

export function Providers({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const authStatus = useUserStore((state) => state.authStatus);
  const errorMessage = useUserStore((state) => state.errorMessage);
  const setAuthLoading = useUserStore((state) => state.setAuthLoading);
  const setSession = useUserStore((state) => state.setSession);
  const setAuthError = useUserStore((state) => state.setAuthError);
  const [showNav, setShowNav] = useState(false);
  const [authDebug, setAuthDebug] = useState<AuthDebugState>({
    visible: false,
    hasTelegram: false,
    initDataLength: 0,
    readyState: 'loading',
  });

  useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message =
        event.reason instanceof Error
          ? event.reason.message
          : typeof event.reason === 'string'
            ? event.reason
            : 'Unhandled promise rejection';
      setAuthError(message);
    };

    const onWindowError = (event: ErrorEvent) => {
      setAuthError(event.message || 'Неизвестная ошибка окна.');
    };

    window.addEventListener('unhandledrejection', onUnhandledRejection);
    window.addEventListener('error', onWindowError);

    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      window.removeEventListener('error', onWindowError);
    };
  }, [setAuthError]);

  useEffect(() => {
    setShowNav(
      pathname === '/' ||
        pathname === '/dashboard' ||
        pathname === '/subscriptions' ||
        pathname === '/profile',
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
    const debugTimer = window.setTimeout(() => {
      if (!active) {
        return;
      }

      const webApp = getTelegramWebApp();
      const initData = getTelegramInitData();
      setAuthDebug({
        visible: true,
        hasTelegram: Boolean(webApp),
        initDataLength: initData.length,
        readyState: document.readyState,
      });
    }, 3500);

    setAuthLoading();
    bootstrapTelegramAuth()
      .then((session) => {
        if (!active) {
          return;
        }

        window.clearTimeout(debugTimer);
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

        window.clearTimeout(debugTimer);
        setAuthError(error instanceof Error ? error.message : 'Не удалось открыть панель.');
      });

    return () => {
      active = false;
      window.clearTimeout(debugTimer);
    };
  }, [authStatus, setAuthError, setAuthLoading, setSession]);

  if (authStatus === 'loading' || authStatus === 'idle') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] items-center justify-center px-6 text-center">
        <div className="space-y-3">
          <div className="mx-auto h-14 w-14 animate-pulse rounded-full bg-tg-muted" />
          <p className="text-base font-medium text-tg-text">Открываем панель…</p>
          <p className="text-sm text-tg-hint">Подключаем Telegram и загружаем ваши данные.</p>
          {authDebug.visible ? (
            <div className="rounded-2xl bg-tg-card p-4 text-left text-xs leading-5 text-tg-hint shadow-card">
              <p>Диагностика загрузки:</p>
              <p>Telegram SDK: {authDebug.hasTelegram ? 'есть' : 'нет'}</p>
              <p>initData length: {authDebug.initDataLength}</p>
              <p>document.readyState: {authDebug.readyState}</p>
            </div>
          ) : null}
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
