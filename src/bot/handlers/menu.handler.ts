import { Injectable } from '@nestjs/common';
import { adminMainMenuKeyboard } from '../keyboards/admin.keyboards';
import { cancelKeyboard } from '../keyboards/common.keyboards';
import { dealerMainMenuKeyboard } from '../keyboards/dealer.keyboards';
import { BotContext } from '../interfaces/bot-context.interface';
import { BotText } from '../messages/bot-text';
import { clearFlow, clearPendingAction } from '../utils/session.util';
import { renderMessage } from '../utils/context.util';
import { BotAccessHandler } from './bot-access.handler';

@Injectable()
export class MenuHandler {
  constructor(private readonly accessHandler: BotAccessHandler) {}

  async showWelcome(ctx: BotContext) {
    clearFlow(ctx);
    clearPendingAction(ctx);

    const access = await this.accessHandler.getAccess(ctx);

    await renderMessage(
      ctx,
      `${BotText.welcome(access.isAdmin, Boolean(access.dealer))}\n\n${BotText.mainMenuTitle(access.isAdmin)}`,
      dealerMainMenuKeyboard(Boolean(access.dealer), access.isAdmin),
    );
  }

  async showMainMenu(ctx: BotContext, prefix?: string) {
    clearFlow(ctx);
    clearPendingAction(ctx);

    const access = await this.accessHandler.getAccess(ctx);
    const text = prefix
      ? `${prefix}\n\n${BotText.mainMenuTitle(access.isAdmin)}`
      : BotText.mainMenuTitle(access.isAdmin);

    await renderMessage(
      ctx,
      text,
      dealerMainMenuKeyboard(Boolean(access.dealer), access.isAdmin),
    );
  }

  async showAdminMenu(ctx: BotContext) {
    const access = await this.accessHandler.ensureAdmin(ctx);
    if (!access) {
      return;
    }

    clearFlow(ctx);
    clearPendingAction(ctx);

    await renderMessage(ctx, BotText.adminMenuTitle(), adminMainMenuKeyboard());
  }

  async showHelp(ctx: BotContext) {
    const access = await this.accessHandler.getAccess(ctx);

    await renderMessage(
      ctx,
      BotText.help(),
      dealerMainMenuKeyboard(Boolean(access.dealer), access.isAdmin),
    );
  }

  async cancelFlow(ctx: BotContext) {
    clearFlow(ctx);
    clearPendingAction(ctx);
    await this.showMainMenu(ctx, BotText.canceled());
  }

  async showFlowPrompt(ctx: BotContext, text: string) {
    await renderMessage(ctx, text, cancelKeyboard());
  }
}
