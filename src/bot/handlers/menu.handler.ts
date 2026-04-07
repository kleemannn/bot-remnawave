import { Injectable } from '@nestjs/common';
import {
  adminMainMenuKeyboard,
  adminManagementKeyboard,
} from '../keyboards/admin.keyboards';
import { cancelKeyboard } from '../keyboards/common.keyboards';
import { dealerMainMenuKeyboard } from '../keyboards/dealer.keyboards';
import { BotContext } from '../interfaces/bot-context.interface';
import { BotText } from '../messages/bot-text';
import {
  clearFlow,
  clearFlowMessageId,
  clearPendingAction,
  setFlowMessageId,
} from '../utils/session.util';
import {
  deleteMessageById,
  isCallbackContext,
  renderMessage,
} from '../utils/context.util';
import { BotAccessHandler } from './bot-access.handler';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';

@Injectable()
export class MenuHandler {
  constructor(
    private readonly accessHandler: BotAccessHandler,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async showWelcome(ctx: BotContext) {
    clearFlow(ctx);
    clearFlowMessageId(ctx);
    clearPendingAction(ctx);

    const access = await this.accessHandler.getAccess(ctx);
    const totalUsers = access.isAdmin
      ? await this.subscriptionsService.countTotalUsers()
      : undefined;

    await renderMessage(
      ctx,
      `${BotText.welcome(access.isAdmin, Boolean(access.dealer))}\n\n${BotText.mainMenuSummary({
        isAdmin: access.isAdmin,
        dealer: access.dealer,
        totalUsers,
      })}`,
      dealerMainMenuKeyboard(Boolean(access.dealer), access.isAdmin),
    );
  }

  async showMainMenu(ctx: BotContext, prefix?: string) {
    clearFlow(ctx);
    clearFlowMessageId(ctx);
    clearPendingAction(ctx);

    const access = await this.accessHandler.getAccess(ctx);
    const totalUsers = access.isAdmin
      ? await this.subscriptionsService.countTotalUsers()
      : undefined;
    const summary = BotText.mainMenuSummary({
      isAdmin: access.isAdmin,
      dealer: access.dealer,
      totalUsers,
    });
    const text = prefix ? `${prefix}\n\n${summary}` : summary;

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
    clearFlowMessageId(ctx);
    clearPendingAction(ctx);

    await renderMessage(ctx, BotText.adminMenuTitle(), adminMainMenuKeyboard());
  }

  async showAdminManagementMenu(ctx: BotContext) {
    const access = await this.accessHandler.ensureAdmin(ctx);
    if (!access) {
      return;
    }

    clearFlow(ctx);
    clearFlowMessageId(ctx);
    clearPendingAction(ctx);

    await renderMessage(
      ctx,
      BotText.adminManagementTitle(),
      adminManagementKeyboard(),
    );
  }

  async showHelp(ctx: BotContext) {
    clearFlow(ctx);
    clearFlowMessageId(ctx);
    clearPendingAction(ctx);

    const access = await this.accessHandler.getAccess(ctx);
    const text =
      access.isAdmin && access.dealer
        ? BotText.combinedHelp()
        : access.isAdmin
          ? BotText.adminHelp()
          : BotText.dealerHelp();

    await renderMessage(
      ctx,
      text,
      dealerMainMenuKeyboard(Boolean(access.dealer), access.isAdmin),
    );
  }

  async cancelFlow(ctx: BotContext) {
    clearFlow(ctx);
    clearFlowMessageId(ctx);
    clearPendingAction(ctx);
    await this.showMainMenu(ctx, BotText.canceled());
  }

  async showFlowPrompt(ctx: BotContext, text: string) {
    if (!isCallbackContext(ctx)) {
      await this.deleteActiveFlowMessage(ctx);
    }

    const messageId = await renderMessage(ctx, text, cancelKeyboard());
    this.rememberFlowMessageId(ctx, messageId);
  }

  private rememberFlowMessageId(ctx: BotContext, messageId: number | null) {
    if (typeof messageId === 'number') {
      setFlowMessageId(ctx, messageId);
      return;
    }

    clearFlowMessageId(ctx);
  }

  private async deleteActiveFlowMessage(ctx: BotContext) {
    const messageId = ctx.session.flowMessageId;
    if (typeof messageId !== 'number') {
      return;
    }

    await deleteMessageById(ctx, messageId);
    clearFlowMessageId(ctx);
  }
}
