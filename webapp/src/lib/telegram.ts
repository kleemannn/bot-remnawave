'use client';

import { AuthUser } from './types';

type TelegramThemeParams = Partial<Record<
  | 'bg_color'
  | 'secondary_bg_color'
  | 'text_color'
  | 'hint_color'
  | 'link_color'
  | 'button_color'
  | 'button_text_color',
  string
>>;

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: AuthUser;
  };
  colorScheme?: 'light' | 'dark';
  themeParams?: TelegramThemeParams;
  ready: () => void;
  expand: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.Telegram?.WebApp ?? null;
}

export function getTelegramUser(): AuthUser | null {
  return getTelegramWebApp()?.initDataUnsafe?.user ?? null;
}

export function getTelegramInitData(): string {
  return getTelegramWebApp()?.initData ?? '';
}

export function expandTelegramWebApp() {
  const webApp = getTelegramWebApp();
  if (!webApp) {
    return;
  }

  webApp.ready();
  webApp.expand();
}

export function applyTelegramTheme() {
  if (typeof document === 'undefined') {
    return;
  }

  const webApp = getTelegramWebApp();
  const root = document.documentElement;
  const theme = webApp?.themeParams;
  const isDark = webApp?.colorScheme === 'dark';

  const bg = theme?.bg_color ?? (isDark ? '#0f1723' : '#f3f7fb');
  const secondaryBg = theme?.secondary_bg_color ?? (isDark ? '#162131' : '#ffffff');
  const text = theme?.text_color ?? (isDark ? '#f5f9ff' : '#0f172a');
  const hint = theme?.hint_color ?? (isDark ? '#8fa1b8' : '#6b7a90');
  const link = theme?.link_color ?? '#2aabee';
  const button = theme?.button_color ?? '#2aabee';
  const buttonText = theme?.button_text_color ?? '#ffffff';

  root.style.setProperty('--tg-bg', bg);
  root.style.setProperty('--tg-text', text);
  root.style.setProperty('--tg-hint', hint);
  root.style.setProperty('--tg-muted', isDark ? '#1d2a3e' : '#eef4fa');
  root.style.setProperty('--tg-card', secondaryBg);
  root.style.setProperty('--tg-card-strong', isDark ? '#1b283a' : '#ffffff');
  root.style.setProperty('--tg-border', isDark ? 'rgba(143, 161, 184, 0.16)' : 'rgba(103, 123, 148, 0.12)');
  root.style.setProperty('--tg-primary', button);
  root.style.setProperty('--tg-primary-text', buttonText);
  root.style.setProperty('--tg-success', '#31b545');
  root.style.setProperty('--tg-warning', '#f5a524');
  root.style.setProperty('--tg-danger', '#ff5d5d');
  root.style.setProperty('color-scheme', isDark ? 'dark' : 'light');

  webApp?.setHeaderColor?.(bg);
  webApp?.setBackgroundColor?.(bg);
}

export function isTelegramEnvironment() {
  return Boolean(getTelegramWebApp());
}
