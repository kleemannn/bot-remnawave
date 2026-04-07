'use client';

import { authenticateMiniApp } from './api';
import { getTelegramInitData, getTelegramUser, isTelegramEnvironment } from './telegram';
import { AuthResponse } from './types';

export async function bootstrapTelegramAuth(): Promise<AuthResponse> {
  if (isTelegramEnvironment()) {
    await waitForTelegramInitData();
  }

  const initData = getTelegramInitData();

  if (initData) {
    return withTimeout(authenticateMiniApp(initData), 8000, 'Сервер авторизации не ответил вовремя.');
  }

  if (isTelegramEnvironment()) {
    throw new Error('Telegram не передал initData. Закройте и откройте Mini App заново.');
  }

  const devJwt = process.env.NEXT_PUBLIC_DEV_JWT;
  if (!devJwt) {
    throw new Error('Откройте панель через Telegram, чтобы пройти авторизацию.');
  }

  const user = getTelegramUser() ?? {
    id: Number(process.env.NEXT_PUBLIC_DEV_TELEGRAM_ID ?? 0),
    username: process.env.NEXT_PUBLIC_DEV_USERNAME ?? 'dealer',
    first_name: 'Dealer',
  };

  return {
    accessToken: devJwt,
    user,
  };
}

async function waitForTelegramInitData() {
  const startedAt = Date.now();

  while (!getTelegramInitData() && Date.now() - startedAt < 2500) {
    await sleep(100);
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      window.setTimeout(() => reject(new Error(message)), timeoutMs),
    ),
  ]);
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
