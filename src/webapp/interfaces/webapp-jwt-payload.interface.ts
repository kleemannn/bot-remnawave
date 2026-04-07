export interface WebappJwtPayload {
  sub: string;
  telegramId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role: 'dealer';
  iat: number;
  exp: number;
}
