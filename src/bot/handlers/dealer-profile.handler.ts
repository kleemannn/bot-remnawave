import { Injectable } from '@nestjs/common';
import { inlineKeyboard } from '../keyboards/common.keyboards';
import { BotContext } from '../interfaces/bot-context.interface';
import { BotText } from '../messages/bot-text';
import { callbackData } from '../utils/callback-data.util';
import { renderMessage } from '../utils/context.util';
import { BotAccessHandler } from './bot-access.handler';

@Injectable()
export class DealerProfileHandler {
  constructor(private readonly accessHandler: BotAccessHandler) {}

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
        [{ text: '🔙 В меню', callback_data: callbackData.mainMenu }],
      ]),
    );
  }
}
