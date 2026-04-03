import { Injectable } from '@nestjs/common';
import { Dealer } from '@prisma/client';
import { AuthService } from '../../auth/auth.service';
import { BotText } from '../messages/bot-text';
import { BotContext } from '../interfaces/bot-context.interface';
import { getTelegramId, renderMessage } from '../utils/context.util';
import { backToMenuKeyboard } from '../keyboards/common.keyboards';

@Injectable()
export class BotAccessHandler {
  constructor(private readonly authService: AuthService) {}

  private accessWithDealer(
    access: Awaited<ReturnType<BotAccessHandler['getAccess']>>,
    dealer: Dealer,
  ) {
    return {
      ...access,
      dealer,
    };
  }

  async getAccess(ctx: BotContext): Promise<{
    telegramId: bigint;
    isAdmin: boolean;
    dealer: Dealer | null;
  }> {
    const telegramId = getTelegramId(ctx);
    const isAdmin = this.authService.isAdmin(telegramId);

    if (isAdmin) {
      await this.authService.upsertAdmin(telegramId, ctx.from?.username);
    }

    const dealer = await this.authService.getDealerByTelegramId(telegramId);

    return {
      telegramId,
      isAdmin,
      dealer,
    };
  }

  async ensureAdmin(ctx: BotContext) {
    const access = await this.getAccess(ctx);
    if (!access.isAdmin) {
      await renderMessage(ctx, BotText.notAdmin(), backToMenuKeyboard());
      return null;
    }

    return access;
  }

  async ensureDealer(ctx: BotContext): Promise<{
    telegramId: bigint;
    isAdmin: boolean;
    dealer: Dealer;
  } | null> {
    const access = await this.getAccess(ctx);
    if (!access.dealer) {
      await renderMessage(ctx, BotText.notDealer(), backToMenuKeyboard());
      return null;
    }

    return this.accessWithDealer(access, access.dealer);
  }
}
