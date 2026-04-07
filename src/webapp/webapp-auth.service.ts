import { createHmac } from 'crypto';
import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppLoggerService } from '../common/logger/app-logger.service';
import { AuthService } from '../auth/auth.service';
import { WebappJwtPayload } from './interfaces/webapp-jwt-payload.interface';
import {
  TelegramMiniAppUser,
  WebappAuthSession,
} from './interfaces/webapp-auth-response.interface';
import { signWebappToken, verifyWebappToken } from './utils/webapp-token.util';

@Injectable()
export class WebappAuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly logger: AppLoggerService,
  ) {}

  async authenticate(initData: string): Promise<WebappAuthSession> {
    const parsed = this.validateInitData(initData);
    const user = parsed.user;

    if (!user?.id) {
      throw new ForbiddenException('Telegram не передал данные пользователя.');
    }

    const telegramId = BigInt(user.id);
    const dealer = await this.authService.getDealerByTelegramId(telegramId);
    if (!dealer) {
      this.logger.warnEvent(
        'webapp_auth_denied_not_dealer',
        {
          telegramId: telegramId.toString(),
          username: user.username ?? null,
        },
        WebappAuthService.name,
      );
      throw new ForbiddenException('Вы не зарегистрированы как дилер.');
    }

    await this.authService.upsertAdmin(telegramId, user.username);

    const now = Math.floor(Date.now() / 1000);
    const payload: WebappJwtPayload = {
      sub: telegramId.toString(),
      telegramId: telegramId.toString(),
      username: user.username ?? dealer.username ?? null,
      firstName: user.first_name ?? null,
      lastName: user.last_name ?? null,
      role: 'dealer',
      iat: now,
      exp:
        now +
        this.configService.get<number>('webapp.jwtTtlSec', 43200),
    };

    this.logger.logEvent(
      'webapp_auth_succeeded',
      {
        telegramId: telegramId.toString(),
        username: payload.username ?? null,
        firstName: payload.firstName ?? null,
      },
      WebappAuthService.name,
    );

    return {
      accessToken: signWebappToken(
        payload,
        this.configService.getOrThrow<string>('app.jwtSecret'),
      ),
      user,
      dealer,
    };
  }

  verifyAccessToken(token: string) {
    return verifyWebappToken(
      token,
      this.configService.getOrThrow<string>('app.jwtSecret'),
    );
  }

  private validateInitData(initData: string): {
    user: TelegramMiniAppUser | null;
  } {
    const searchParams = new URLSearchParams(initData);
    const hash = searchParams.get('hash');

    if (!hash) {
      throw new ForbiddenException('Отсутствует Telegram hash.');
    }

    const dataCheckString = [...searchParams.entries()]
      .filter(([key]) => key !== 'hash' && key !== 'signature')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = createHmac('sha256', 'WebAppData')
      .update(this.configService.getOrThrow<string>('telegram.botToken'))
      .digest();
    const expectedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (expectedHash !== hash) {
      this.logger.warnEvent(
        'webapp_auth_invalid_hash',
        undefined,
        WebappAuthService.name,
      );
      throw new ForbiddenException('Не удалось подтвердить Telegram-сессию.');
    }

    const authDate = Number(searchParams.get('auth_date') ?? 0);
    const now = Math.floor(Date.now() / 1000);
    const ttl = this.configService.get<number>('webapp.initDataTtlSec', 3600);

    if (!Number.isFinite(authDate) || now - authDate > ttl) {
      throw new ForbiddenException('Сессия Telegram устарела. Откройте Mini App заново.');
    }

    const rawUser = searchParams.get('user');
    if (!rawUser) {
      return {
        user: null,
      };
    }

    try {
      return {
        user: JSON.parse(rawUser) as TelegramMiniAppUser,
      };
    } catch {
      throw new ForbiddenException('Telegram передал поврежденные данные пользователя.');
    }
  }
}
