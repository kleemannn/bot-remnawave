import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Dealer } from '@prisma/client';
import { DealersService } from '../dealers/dealers.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly dealersService: DealersService,
  ) {}

  isAdmin(telegramId: bigint): boolean {
    const adminIds =
      this.configService.get<string[]>('telegram.adminIds', []) ?? [];
    return adminIds.includes(telegramId.toString());
  }

  async getDealerByTelegramId(telegramId: bigint): Promise<Dealer | null> {
    return this.dealersService.getDealerByTelegramId(telegramId);
  }

  async upsertAdmin(telegramId: bigint, username?: string | null): Promise<void> {
    if (!this.isAdmin(telegramId)) {
      return;
    }

    await this.prisma.admin.upsert({
      where: { telegramId },
      update: {
        username: username ?? null,
      },
      create: {
        telegramId,
        username: username ?? null,
      },
    });
  }
}
