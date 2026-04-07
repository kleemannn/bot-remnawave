'use client';

import { authenticateMiniApp } from './api';
import { getTelegramInitData, getTelegramUser } from './telegram';
import { AuthResponse } from './types';

export async function bootstrapTelegramAuth(): Promise<AuthResponse> {
  const initData = getTelegramInitData();

  if (initData) {
    return authenticateMiniApp(initData);
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
