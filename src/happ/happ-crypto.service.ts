import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class HappCryptoService {
  private readonly logger = new Logger(HappCryptoService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async encryptSubscriptionUrl(url: string): Promise<string> {
    const apiUrl = this.configService.get<string>(
      'happ.cryptoApiUrl',
      'https://crypto.happ.su/api-v2.php',
    );
    const timeout = this.configService.get<number>('happ.timeoutMs', 10000);

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          apiUrl,
          { url },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout,
          },
        ),
      );

      const encrypted = this.pickEncryptedLink(response.data);
      if (!encrypted) {
        this.logger.error('Unexpected HAPP API response shape', response.data);
        throw new InternalServerErrorException('HAPP API вернул неожиданный формат ответа.');
      }

      return encrypted;
    } catch (error) {
      this.logger.error('HAPP encryption failed', error);
      throw new InternalServerErrorException('Ошибка шифрования ссылки HAPP.');
    }
  }

  private pickEncryptedLink(payload: unknown): string | null {
    if (typeof payload === 'string') {
      const value = payload.trim();
      return value.startsWith('happ://') ? value : null;
    }

    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const obj = payload as Record<string, unknown>;
    const candidates = [
      obj.encrypted_link,
      obj.encryptedUrl,
      obj.encrypted_url,
      obj.url,
      obj.result,
      obj.data,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim().startsWith('happ://')) {
        return candidate.trim();
      }
    }

    return null;
  }
}
