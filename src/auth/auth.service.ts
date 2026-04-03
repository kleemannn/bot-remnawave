import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Dealer } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  isAdmin(telegramId: bigint): boolean {
    const adminIds =
      this.configService.get<string[]>('telegram.adminIds', []) ?? [];
    return adminIds.includes(telegramId.toString());
  }

  async getDealerByTelegramId(telegramId: bigint): Promise<Dealer | null> {
    return this.prisma.dealer.findUnique({
      where: { telegramId },
    });
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
