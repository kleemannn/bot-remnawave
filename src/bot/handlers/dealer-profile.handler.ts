import { Injectable } from '@nestjs/common';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';
import { inlineKeyboard } from '../keyboards/common.keyboards';
import { BotContext } from '../interfaces/bot-context.interface';
import { BotText } from '../messages/bot-text';
import { callbackData } from '../utils/callback-data.util';
import { answerCallback, renderMessage } from '../utils/context.util';
import { BotAccessHandler } from './bot-access.handler';
import { BotProtectionService } from '../services/bot-protection.service';

@Injectable()
export class DealerProfileHandler {
  constructor(
    private readonly accessHandler: BotAccessHandler,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly protectionService: BotProtectionService,
  ) {}

  async showProfile(ctx: BotContext) {
    const access = await this.accessHandler.ensureDealer(ctx);
    if (!access) {
      return;
    }

    await renderMessage(
      ctx,
      BotText.dealerProfile(access.dealer),
      inlineKeyboard([
        [
          { text: '📋 Мои подписки', callback_data: callbackData.subscriptionsList(1) },
          { text: '📦 Создать', callback_data: callbackData.dealerCreateStart },
        ],
        [{ text: '📤 Выгрузить пользователей', callback_data: callbackData.dealerExportUsers }],
        [{ text: '🔙 В меню', callback_data: callbackData.mainMenu }],
      ]),
    );
  }

  async exportUsers(ctx: BotContext) {
    const access = await this.accessHandler.ensureDealer(ctx);
    if (!access) {
      return;
    }

    await answerCallback(ctx, 'Готовлю выгрузку...');

    const rows = await this.protectionService.runExpensiveAction(
      access.telegramId.toString(),
      `dealer:export-users:${access.telegramId.toString()}`,
      () => this.subscriptionsService.exportDealerUsers(access.telegramId),
    );

    if (rows.length === 0) {
      await ctx.reply('У вас пока нет активных пользователей для выгрузки.');
      return;
    }

    const content = rows
      .map((row, index) => `${index + 1}. ${row.username}\n${row.subscriptionUrl}`)
      .join('\n\n');

    const fileName = `dealer-users-${access.telegramId.toString()}.txt`;

    const sentDocument = await (
      ctx as BotContext & {
        replyWithDocument?: (
          document: { source: Buffer; filename: string },
          extra?: Record<string, unknown>,
        ) => Promise<unknown>;
      }
    ).replyWithDocument?.(
      {
        source: Buffer.from(content, 'utf-8'),
        filename: fileName,
      },
      {
        caption: `Выгрузка пользователей: ${rows.length}`,
      },
    );

    if (!sentDocument) {
      await ctx.reply(content);
    }
  }
}
