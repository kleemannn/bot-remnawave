import { Action, Command, Ctx, On, Start, Update } from 'nestjs-telegraf';
import { DealerTag } from '@prisma/client';
import { BotContext } from './interfaces/bot-context.interface';
import { MenuHandler } from './handlers/menu.handler';
import { DealerProfileHandler } from './handlers/dealer-profile.handler';
import { SubscriptionsHandler } from './handlers/subscriptions.handler';
import { AdminHandler } from './handlers/admin.handler';
import { BotText } from './messages/bot-text';
import {
  answerCallback,
  deleteMessageById,
  getMessageText,
} from './utils/context.util';
import { BotProtectionService } from './services/bot-protection.service';
import { InvalidCallbackDataException } from '../common/errors/app-exceptions';
import { BotErrorMapperService } from '../common/errors/bot-error-mapper.service';
import { AppLoggerService } from '../common/logger/app-logger.service';
import {
  clearTransientErrorMessageId,
  getTransientErrorMessageId,
  setTransientErrorMessageId,
} from './utils/session.util';

@Update()
export class BotUpdate {
  constructor(
    private readonly menuHandler: MenuHandler,
    private readonly dealerProfileHandler: DealerProfileHandler,
    private readonly subscriptionsHandler: SubscriptionsHandler,
    private readonly adminHandler: AdminHandler,
    private readonly protectionService: BotProtectionService,
    private readonly errorMapper: BotErrorMapperService,
    private readonly logger: AppLoggerService,
  ) {}

  @Start()
  async onStart(@Ctx() ctx: BotContext) {
    await this.safeExecute(ctx, () => this.menuHandler.showWelcome(ctx));
  }

  @Command('menu')
  async onMenu(@Ctx() ctx: BotContext) {
    await this.safeExecute(ctx, () => this.menuHandler.showMainMenu(ctx));
  }

  @Command('help')
  async onHelp(@Ctx() ctx: BotContext) {
    await this.safeExecute(ctx, () => this.menuHandler.showHelp(ctx));
  }

  @Command('cancel')
  async onCancel(@Ctx() ctx: BotContext) {
    await this.safeExecute(ctx, () => this.menuHandler.cancelFlow(ctx));
  }

  @Command('create')
  async onCreateShortcut(@Ctx() ctx: BotContext) {
    await this.safeExecute(ctx, () => this.subscriptionsHandler.startCreateFlow(ctx));
  }

  @Command('my_subs')
  async onMySubscriptionsShortcut(@Ctx() ctx: BotContext) {
    await this.safeExecute(ctx, () => this.subscriptionsHandler.showSubscriptionsList(ctx, 1));
  }

  @Command('me')
  async onProfileShortcut(@Ctx() ctx: BotContext) {
    await this.safeExecute(ctx, () => this.dealerProfileHandler.showProfile(ctx));
  }

  @Command('admin')
  async onAdminShortcut(@Ctx() ctx: BotContext) {
    await this.safeExecute(ctx, () => this.menuHandler.showAdminMenu(ctx));
  }

  @Command('add_dealer')
  async onAddDealerShortcut(@Ctx() ctx: BotContext) {
    await this.safeExecute(ctx, () => this.adminHandler.startAddDealerFlow(ctx));
  }

  @Command('delete_dealer')
  async onDeleteDealerShortcut(@Ctx() ctx: BotContext) {
    await this.safeExecute(ctx, () => this.adminHandler.startDeleteDealerFlow(ctx));
  }

  @Command('set_tag')
  async onSetTagShortcut(@Ctx() ctx: BotContext) {
    await this.safeExecute(ctx, () => this.adminHandler.startChangeTagFlow(ctx));
  }

  @Command('set_limit')
  async onSetLimitShortcut(@Ctx() ctx: BotContext) {
    await this.safeExecute(ctx, () => this.adminHandler.startChangeLimitFlow(ctx));
  }

  @Command('extend')
  async onSetExpirationShortcut(@Ctx() ctx: BotContext) {
    await this.safeExecute(ctx, () => this.adminHandler.startChangeExpirationFlow(ctx));
  }

  @Command('stats')
  async onStatsShortcut(@Ctx() ctx: BotContext) {
    await this.safeExecute(ctx, () => this.adminHandler.showStats(ctx));
  }

  @Command('delete')
  async onDeleteShortcut(@Ctx() ctx: BotContext) {
    await this.openSubscriptionsFromLegacyCommand(ctx);
  }

  @Command('pause')
  async onPauseShortcut(@Ctx() ctx: BotContext) {
    await this.openSubscriptionsFromLegacyCommand(ctx);
  }

  @Command('resume')
  async onResumeShortcut(@Ctx() ctx: BotContext) {
    await this.openSubscriptionsFromLegacyCommand(ctx);
  }

  @Command('expiry')
  async onExpiryShortcut(@Ctx() ctx: BotContext) {
    await this.openSubscriptionsFromLegacyCommand(ctx);
  }

  private async openSubscriptionsFromLegacyCommand(ctx: BotContext) {
    await this.safeExecute(ctx, async () => {
      await ctx.reply(
        'Откройте нужную подписку из списка кнопкой ниже. Я помогу выполнить действие пошагово.',
      );
      await this.subscriptionsHandler.showSubscriptionsList(ctx, 1);
    });
  }

  @Action(/^flow:cancel$/)
  async onCancelAction(@Ctx() ctx: BotContext) {
    await this.safeExecute(ctx, () => this.menuHandler.cancelFlow(ctx));
  }

  @Action(/^menu:/)
  async onMenuAction(@Ctx() ctx: BotContext) {
    await this.safeExecute(ctx, async () => {
      const data = this.getCallbackData(ctx);

      if (data === 'menu:main') {
        await this.menuHandler.showMainMenu(ctx);
        return;
      }

      if (data === 'menu:help') {
        await this.menuHandler.showHelp(ctx);
        return;
      }

      if (data === 'menu:admin') {
        await this.menuHandler.showAdminMenu(ctx);
        return;
      }

      if (data === 'menu:admin:management') {
        await this.menuHandler.showAdminManagementMenu(ctx);
      }
    });
  }

  @Action(/^dealer:/)
  async onDealerAction(@Ctx() ctx: BotContext) {
    await this.safeExecute(ctx, async () => {
      const data = this.getCallbackData(ctx);

      if (data === 'dealer:profile') {
        await this.dealerProfileHandler.showProfile(ctx);
        return;
      }

      if (data === 'dealer:create:start') {
        await this.subscriptionsHandler.startCreateFlow(ctx);
        return;
      }

      if (data === 'dealer:create:confirm') {
        await this.subscriptionsHandler.confirmCreate(ctx);
        return;
      }

      if (data.startsWith('dealer:create:days:')) {
        await this.subscriptionsHandler.selectCreateDays(
          ctx,
          this.parsePageValue(this.getCallbackSegment(data, 3)),
        );
        return;
      }

      if (data.startsWith('dealer:create:link:')) {
        await this.subscriptionsHandler.showCreatedLink(
          ctx,
          this.getCallbackSegment(data, 3),
        );
        return;
      }

      if (data === 'dealer:search:start') {
        await this.subscriptionsHandler.startSearchFlow(ctx);
      }
    });
  }

  @Action(/^subs:/)
  async onSubscriptionAction(@Ctx() ctx: BotContext) {
    await this.safeExecute(ctx, async () => {
      const data = this.getCallbackData(ctx);

      if (data.startsWith('subs:list:')) {
        await this.subscriptionsHandler.showSubscriptionsList(
          ctx,
          this.parsePageValue(this.getCallbackSegment(data, 2)),
        );
        return;
      }

      if (data.startsWith('subs:search:list:')) {
        await this.subscriptionsHandler.showSearchResults(
          ctx,
          this.parsePageValue(this.getCallbackSegment(data, 3)),
        );
        return;
      }

      if (data.startsWith('subs:card:')) {
        await this.subscriptionsHandler.showSubscriptionCard(
          ctx,
          this.getCallbackSegment(data, 2),
        );
        return;
      }

      if (data.startsWith('subs:link:')) {
        await this.subscriptionsHandler.showSubscriptionLink(
          ctx,
          this.getCallbackSegment(data, 2),
        );
        return;
      }

      if (data.startsWith('subs:pause:ask:')) {
        await this.subscriptionsHandler.askPauseConfirmation(
          ctx,
          this.getCallbackSegment(data, 3),
        );
        return;
      }

      if (data.startsWith('subs:pause:confirm:')) {
        await this.subscriptionsHandler.confirmPause(
          ctx,
          this.getCallbackSegment(data, 3),
        );
        return;
      }

      if (data.startsWith('subs:resume:ask:')) {
        await this.subscriptionsHandler.askResumeConfirmation(
          ctx,
          this.getCallbackSegment(data, 3),
        );
        return;
      }

      if (data.startsWith('subs:resume:confirm:')) {
        await this.subscriptionsHandler.confirmResume(
          ctx,
          this.getCallbackSegment(data, 3),
        );
        return;
      }

      if (data.startsWith('subs:delete:ask:')) {
        await this.subscriptionsHandler.askDeleteConfirmation(
          ctx,
          this.getCallbackSegment(data, 3),
        );
        return;
      }

      if (data.startsWith('subs:delete:confirm:')) {
        await this.subscriptionsHandler.confirmDelete(
          ctx,
          this.getCallbackSegment(data, 3),
        );
      }
    });
  }

  @Action(/^admin:/)
  async onAdminAction(@Ctx() ctx: BotContext) {
    await this.safeExecute(ctx, async () => {
      const data = this.getCallbackData(ctx);

      if (data === 'admin:add:start') {
        await this.adminHandler.startAddDealerFlow(ctx);
        return;
      }

      if (data === 'admin:add:confirm') {
        await this.adminHandler.confirmAddDealer(ctx);
        return;
      }

      if (data === 'admin:delete:start') {
        await this.adminHandler.startDeleteDealerFlow(ctx);
        return;
      }

      if (data.startsWith('admin:delete:ask:')) {
        await this.adminHandler.askDeleteDealerConfirmation(
          ctx,
          this.getCallbackSegment(data, 3),
        );
        return;
      }

      if (data.startsWith('admin:delete:confirm:')) {
        await this.adminHandler.confirmDeleteDealer(
          ctx,
          this.getCallbackSegment(data, 3),
        );
        return;
      }

      if (data.startsWith('admin:delete:list:')) {
        await this.adminHandler.listDealersForDeletion(
          ctx,
          this.parsePageValue(this.getCallbackSegment(data, 3)),
        );
        return;
      }

      if (data.startsWith('admin:dealers:')) {
        await this.adminHandler.listDealers(
          ctx,
          this.parsePageValue(this.getCallbackSegment(data, 2)),
        );
        return;
      }

      if (data.startsWith('admin:dealer:')) {
        if (data.startsWith('admin:dealer:active:')) {
          const telegramId = this.getCallbackSegment(data, 3);
          const active = this.getCallbackSegment(data, 4);
          if (active !== 'on' && active !== 'off') {
            throw new InvalidCallbackDataException();
          }
          await this.adminHandler.toggleDealerActive(ctx, telegramId, active === 'on');
          return;
        }

        await this.adminHandler.showDealerCard(ctx, this.getCallbackSegment(data, 2));
        return;
      }

      if (data === 'admin:info:start') {
        await this.adminHandler.startDealerInfoFlow(ctx);
        return;
      }

      if (data === 'admin:tag:start') {
        await this.adminHandler.startChangeTagFlow(ctx);
        return;
      }

      if (data.startsWith('admin:tag:start:')) {
        await this.adminHandler.startChangeTagFlow(ctx, this.getCallbackSegment(data, 3));
        return;
      }

      if (data.startsWith('admin:tag:select:')) {
        const tag = this.getCallbackSegment(data, 3);
        if (tag !== 'PREMIUM' && tag !== 'STANDARD') {
          throw new InvalidCallbackDataException();
        }
        await this.adminHandler.selectTag(
          ctx,
          tag === 'PREMIUM' ? DealerTag.PREMIUM : DealerTag.STANDARD,
        );
        return;
      }

      if (data === 'admin:tag:confirm') {
        await this.adminHandler.confirmChangeTag(ctx);
        return;
      }

      if (data === 'admin:limit:start') {
        await this.adminHandler.startChangeLimitFlow(ctx);
        return;
      }

      if (data.startsWith('admin:limit:start:')) {
        await this.adminHandler.startChangeLimitFlow(ctx, this.getCallbackSegment(data, 3));
        return;
      }

      if (data === 'admin:limit:confirm') {
        await this.adminHandler.confirmChangeLimit(ctx);
        return;
      }

      if (data === 'admin:expiration:start') {
        await this.adminHandler.startChangeExpirationFlow(ctx);
        return;
      }

      if (data.startsWith('admin:expiration:start:')) {
        await this.adminHandler.startChangeExpirationFlow(
          ctx,
          this.getCallbackSegment(data, 3),
        );
        return;
      }

      if (data === 'admin:expiration:confirm') {
        await this.adminHandler.confirmChangeExpiration(ctx);
        return;
      }

      if (data === 'admin:stats') {
        await this.adminHandler.showStats(ctx);
      }
    });
  }

  @On('text')
  async onText(@Ctx() ctx: BotContext) {
    await this.safeExecute(ctx, async () => {
      const text = getMessageText(ctx);
      if (!text) {
        return;
      }

      if (text.startsWith('/')) {
        return;
      }

      if (/^отмена$/i.test(text)) {
        await this.menuHandler.cancelFlow(ctx);
        return;
      }

      const subscriptionsHandled = await this.subscriptionsHandler.handleText(ctx);
      if (subscriptionsHandled) {
        return;
      }

      const adminHandled = await this.adminHandler.handleText(ctx);
      if (adminHandled) {
        return;
      }

      await this.menuHandler.showMainMenu(ctx, BotText.chooseMenuAction());
    });
  }

  private getCallbackData(ctx: BotContext): string {
    return (
      ((ctx as BotContext & {
        callbackQuery?: { data?: string };
      }).callbackQuery?.data ?? '')
    );
  }

  private async safeExecute(ctx: BotContext, action: () => Promise<void>) {
    try {
      this.protectionService.enforceInboundRateLimit(
        this.getActorId(ctx),
        this.getEventKind(ctx),
      );
      await this.cleanupTransientErrorMessage(ctx);
      await this.subscriptionsHandler.cleanupShownLinkMessage(ctx);
      await action();
    } catch (error) {
      const message = this.errorMapper.toUserMessage(error);
      this.logger.errorEvent(
        'bot_handler_error',
        {
          actorId: this.getActorId(ctx),
          eventKind: this.getEventKind(ctx),
          callbackData: this.getCallbackData(ctx) || undefined,
          text: this.getSafeText(ctx),
          errorName: error instanceof Error ? error.name : 'UnknownError',
          errorMessage: error instanceof Error ? error.message : String(error),
        },
        error instanceof Error ? error.stack : undefined,
        BotUpdate.name,
      );
      await answerCallback(ctx);
      await this.cleanupTransientErrorMessage(ctx);
      const sentMessage = await ctx.reply(BotText.genericError(message));
      const messageId = (sentMessage as { message_id?: number }).message_id;
      if (typeof messageId === 'number') {
        setTransientErrorMessageId(ctx, messageId);
      }
    }
  }

  private async cleanupTransientErrorMessage(ctx: BotContext) {
    const messageId = getTransientErrorMessageId(ctx);
    if (typeof messageId !== 'number') {
      return;
    }

    await deleteMessageById(ctx, messageId);
    clearTransientErrorMessageId(ctx);
  }

  private getActorId(ctx: BotContext): string {
    return String(ctx.from?.id ?? 'unknown');
  }

  private getEventKind(ctx: BotContext): 'text' | 'callback' | 'command' {
    if (this.getCallbackData(ctx)) {
      return 'callback';
    }

    const text = getMessageText(ctx);
    if (text.startsWith('/')) {
      return 'command';
    }

    return 'text';
  }

  private getSafeText(ctx: BotContext): string | undefined {
    const text = getMessageText(ctx);
    if (!text || text.startsWith('/')) {
      return text || undefined;
    }

    return text.slice(0, 128);
  }

  private getCallbackSegment(data: string, index: number): string {
    const value = data.split(':')[index];
    if (!value) {
      throw new InvalidCallbackDataException();
    }

    return value;
  }

  private parsePageValue(value: string): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new InvalidCallbackDataException();
    }

    return parsed;
  }
}
