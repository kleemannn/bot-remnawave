import { Action, Command, Ctx, On, Start, Update } from 'nestjs-telegraf';
import { DealerTag } from '@prisma/client';
import { BotContext } from './interfaces/bot-context.interface';
import { MenuHandler } from './handlers/menu.handler';
import { DealerProfileHandler } from './handlers/dealer-profile.handler';
import { SubscriptionsHandler } from './handlers/subscriptions.handler';
import { AdminHandler } from './handlers/admin.handler';
import { BotText } from './messages/bot-text';
import { answerCallback, getMessageText } from './utils/context.util';

@Update()
export class BotUpdate {
  constructor(
    private readonly menuHandler: MenuHandler,
    private readonly dealerProfileHandler: DealerProfileHandler,
    private readonly subscriptionsHandler: SubscriptionsHandler,
    private readonly adminHandler: AdminHandler,
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
          Number(data.split(':')[3]),
        );
        return;
      }

      if (data.startsWith('dealer:create:link:')) {
        await this.subscriptionsHandler.showCreatedLink(
          ctx,
          data.split(':')[3],
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
          Number(data.split(':')[2]),
        );
        return;
      }

      if (data.startsWith('subs:search:list:')) {
        await this.subscriptionsHandler.showSearchResults(
          ctx,
          Number(data.split(':')[3]),
        );
        return;
      }

      if (data.startsWith('subs:card:')) {
        await this.subscriptionsHandler.showSubscriptionCard(
          ctx,
          data.split(':')[2],
        );
        return;
      }

      if (data.startsWith('subs:link:')) {
        await this.subscriptionsHandler.showSubscriptionLink(
          ctx,
          data.split(':')[2],
        );
        return;
      }

      if (data.startsWith('subs:pause:ask:')) {
        await this.subscriptionsHandler.askPauseConfirmation(
          ctx,
          data.split(':')[3],
        );
        return;
      }

      if (data.startsWith('subs:pause:confirm:')) {
        await this.subscriptionsHandler.confirmPause(
          ctx,
          data.split(':')[3],
        );
        return;
      }

      if (data.startsWith('subs:resume:ask:')) {
        await this.subscriptionsHandler.askResumeConfirmation(
          ctx,
          data.split(':')[3],
        );
        return;
      }

      if (data.startsWith('subs:resume:confirm:')) {
        await this.subscriptionsHandler.confirmResume(
          ctx,
          data.split(':')[3],
        );
        return;
      }

      if (data.startsWith('subs:delete:ask:')) {
        await this.subscriptionsHandler.askDeleteConfirmation(
          ctx,
          data.split(':')[3],
        );
        return;
      }

      if (data.startsWith('subs:delete:confirm:')) {
        await this.subscriptionsHandler.confirmDelete(
          ctx,
          data.split(':')[3],
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
          data.split(':')[3],
        );
        return;
      }

      if (data.startsWith('admin:delete:confirm:')) {
        await this.adminHandler.confirmDeleteDealer(
          ctx,
          data.split(':')[3],
        );
        return;
      }

      if (data.startsWith('admin:dealers:')) {
        await this.adminHandler.listDealers(ctx, Number(data.split(':')[2]));
        return;
      }

      if (data.startsWith('admin:dealer:')) {
        if (data.startsWith('admin:dealer:active:')) {
          const [, , , telegramId, active] = data.split(':');
          await this.adminHandler.toggleDealerActive(ctx, telegramId, active === 'on');
          return;
        }

        await this.adminHandler.showDealerCard(ctx, data.split(':')[2]);
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
        await this.adminHandler.startChangeTagFlow(ctx, data.split(':')[3]);
        return;
      }

      if (data.startsWith('admin:tag:select:')) {
        await this.adminHandler.selectTag(
          ctx,
          data.split(':')[3] === 'PREMIUM'
            ? DealerTag.PREMIUM
            : DealerTag.STANDARD,
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
        await this.adminHandler.startChangeLimitFlow(ctx, data.split(':')[3]);
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
          data.split(':')[3],
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
      await this.subscriptionsHandler.cleanupShownLinkMessage(ctx);
      await action();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      await answerCallback(ctx);
      await ctx.reply(BotText.genericError(message));
    }
  }
}
