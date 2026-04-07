import { Dealer } from '@prisma/client';

export interface TelegramMiniAppUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface WebappAuthSession {
  accessToken: string;
  user: TelegramMiniAppUser;
  dealer: Dealer;
}
