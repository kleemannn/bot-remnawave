'use client';

import React, { PropsWithChildren } from 'react';
import { getTelegramInitData, getTelegramWebApp } from '@/lib/telegram';

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class AppErrorBoundary extends React.Component<
  PropsWithChildren,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Неизвестная ошибка интерфейса.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('Mini App runtime error:', error);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] items-center justify-center px-6 text-center">
        <div className="space-y-4 rounded-[28px] border border-tg-border bg-tg-card p-6 shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-tg-muted text-2xl">
            ⚠
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-tg-text">Интерфейс упал</h1>
            <p className="text-sm leading-6 text-tg-hint">{this.state.errorMessage}</p>
          </div>
          <div className="rounded-2xl bg-tg-muted p-4 text-left text-xs leading-5 text-tg-hint">
            <p>pathname: {typeof window !== 'undefined' ? window.location.pathname : '-'}</p>
            <p>Telegram SDK: {getTelegramWebApp() ? 'есть' : 'нет'}</p>
            <p>initData length: {getTelegramInitData().length}</p>
            <p>userAgent: {typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : '-'}</p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-tg-primary px-4 py-3 text-[15px] font-semibold text-tg-primaryText"
          >
            Перезагрузить
          </button>
        </div>
      </div>
    );
  }
}
