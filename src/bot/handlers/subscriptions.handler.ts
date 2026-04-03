import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DealersService } from '../../dealers/dealers.service';
import { BOT_FLOW, DealerCreateSubscriptionFlow, DealerSearchSubscriptionFlow } from '../scenes/bot-scenes';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';
import { BOT_UI } from '../constants/bot-ui.constants';
import { BotAccessHandler } from './bot-access.handler';
import { MenuHandler } from './menu.handler';
import { BotContext } from '../interfaces/bot-context.interface';
import { BotText } from '../messages/bot-text';
import { CreateSubscriptionDto } from '../../subscriptions/dto/create-subscription.dto';
import { sanitizeUsername, parsePositiveInt } from '../utils/input.util';
import { clearFlow, setFlow, setSubscriptionsView } from '../utils/session.util';
import { renderMessage } from '../utils/context.util';
import {
  createSubscriptionConfirmKeyboard,
  subscriptionActionSuccessKeyboard,
  subscriptionCardKeyboard,
  subscriptionsListKeyboard,
} from '../keyboards/subscription.keyboards';
import { confirmationKeyboard, inlineKeyboard } from '../keyboards/common.keyboards';
import { callbackData } from '../utils/callback-data.util';
import { dealerAfterCreateKeyboard } from '../keyboards/dealer.keyboards';

@Injectable()
export class SubscriptionsHandler {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly dealersService: DealersService,
    private readonly accessHandler: BotAccessHandler,
    private readonly menuHandler: MenuHandler,
  ) {}

  async handleText(ctx: BotContext): Promise<boolean> {
    const flow = ctx.session.flow;
    if (!flow) {
      return false;
    }

    if (flow.type === BOT_FLOW.DEALER_CREATE_SUBSCRIPTION) {
      await this.handleCreateSubscriptionText(
        ctx,
        flow as DealerCreateSubscriptionFlow,
      );
      return true;
    }

    if (flow.type === BOT_FLOW.DEALER_SEARCH_SUBSCRIPTION) {
      await this.handleSearchText(ctx, flow as DealerSearchSubscriptionFlow);
      return true;
    }

    return false;
  }

  async startCreateFlow(ctx: BotContext) {
    const access = await this.accessHandler.ensureDealer(ctx);
    if (!access) {
      return;
    }

    const guard = this.dealersService.isDealerBlocked(access.dealer);
    if (guard.blocked) {
      await renderMessage(
        ctx,
        BotText.dealerBlocked(access.dealer, guard.reason ?? 'Создание недоступно.'),
        inlineKeyboard([
          [{ text: '👤 Профиль', callback_data: callbackData.dealerProfile }],
          [{ text: '🔙 В меню', callback_data: callbackData.mainMenu }],
        ]),
      );
      return;
    }

    setFlow(ctx, {
      type: BOT_FLOW.DEALER_CREATE_SUBSCRIPTION,
      step: 'username',
      data: {},
    });

    await this.menuHandler.showFlowPrompt(ctx, BotText.askSubscriptionUsername());
  }

  async confirmCreate(ctx: BotContext) {
    const access = await this.accessHandler.ensureDealer(ctx);
    if (!access) {
      return;
    }

    const flow = ctx.session.flow;
    if (
      !flow ||
      flow.type !== BOT_FLOW.DEALER_CREATE_SUBSCRIPTION ||
      flow.step !== 'confirm' ||
      !flow.data.username ||
      !flow.data.days
    ) {
      await this.menuHandler.showMainMenu(ctx, BotText.chooseMenuAction());
      return;
    }

    const dto = plainToInstance(CreateSubscriptionDto, {
      username: flow.data.username,
      days: flow.data.days,
    });
    const errors = await validate(dto);
    if (errors.length > 0) {
      await this.menuHandler.showFlowPrompt(
        ctx,
        'Данные заполнены некорректно. Начните создание подписки заново.',
      );
      await this.startCreateFlow(ctx);
      return;
    }

    const result = await this.subscriptionsService.createForDealer(access.telegramId, dto);

    clearFlow(ctx);

    await renderMessage(
      ctx,
      BotText.subscriptionCreated({
        id: result.subscription.id,
        username: dto.username,
        days: dto.days,
        dealerTag: access.dealer.tag,
        expiresAt: result.subscription.expiresAt,
        happEncryptedUrl: result.happEncryptedUrl,
        subscriptionUrl: result.subscriptionUrl,
      }),
      dealerAfterCreateKeyboard(),
    );
  }

  async startSearchFlow(ctx: BotContext) {
    const access = await this.accessHandler.ensureDealer(ctx);
    if (!access) {
      return;
    }

    setFlow(ctx, {
      type: BOT_FLOW.DEALER_SEARCH_SUBSCRIPTION,
      step: 'username',
      data: {},
    });

    await this.menuHandler.showFlowPrompt(ctx, BotText.askSearchUsername());
  }

  async showSubscriptionsList(ctx: BotContext, page = 1) {
    const access = await this.accessHandler.ensureDealer(ctx);
    if (!access) {
      return;
    }

    const result = await this.subscriptionsService.listByDealerPaginated(
      access.telegramId,
      page,
      BOT_UI.SUBSCRIPTIONS_PAGE_SIZE,
    );

    setSubscriptionsView(ctx, {
      mode: 'all',
      page: result.page,
    });

    if (result.total === 0) {
      await renderMessage(
        ctx,
        BotText.emptySubscriptions(),
        inlineKeyboard([
          [{ text: '📦 Создать', callback_data: callbackData.dealerCreateStart }],
          [{ text: '🔙 В меню', callback_data: callbackData.mainMenu }],
        ]),
      );
      return;
    }

    await renderMessage(
      ctx,
      BotText.subscriptionsList(result.page, result.pageCount),
      subscriptionsListKeyboard(result.items, result.page, result.pageCount, 'all'),
    );
  }

  async showSearchResults(ctx: BotContext, page = 1) {
    const access = await this.accessHandler.ensureDealer(ctx);
    if (!access) {
      return;
    }

    const query = ctx.session.subscriptionsView?.query;
    if (!query) {
      await this.startSearchFlow(ctx);
      return;
    }

    const result = await this.subscriptionsService.searchByDealerUsername(
      access.telegramId,
      query,
      page,
      BOT_UI.SUBSCRIPTIONS_PAGE_SIZE,
    );

    setSubscriptionsView(ctx, {
      mode: 'search',
      page: result.page,
      query,
    });

    if (result.total === 0) {
      await renderMessage(
        ctx,
        BotText.noSearchResults(query),
        inlineKeyboard([
          [{ text: '🔍 Повторить поиск', callback_data: callbackData.dealerSearchStart }],
          [{ text: '🔙 Назад', callback_data: callbackData.subscriptionsList(1) }],
        ]),
      );
      return;
    }

    await renderMessage(
      ctx,
      BotText.subscriptionsList(result.page, result.pageCount, query),
      subscriptionsListKeyboard(result.items, result.page, result.pageCount, 'search'),
    );
  }

  async showSubscriptionCard(ctx: BotContext, subscriptionId: string) {
    const access = await this.accessHandler.ensureDealer(ctx);
    if (!access) {
      return;
    }

    const subscription = await this.subscriptionsService.getSubscriptionForDealer(
      access.telegramId,
      subscriptionId,
    );
    const view = ctx.session.subscriptionsView ?? {
      mode: 'all' as const,
      page: 1,
    };

    await renderMessage(
      ctx,
      BotText.subscriptionCard(subscription),
      subscriptionCardKeyboard(subscription.id, subscription.status, view.mode, view.page),
    );
  }

  async askPauseConfirmation(ctx: BotContext, subscriptionId: string) {
    await this.askActionConfirmation(
      ctx,
      subscriptionId,
      'Пауза подписки',
      callbackData.subscriptionPauseConfirm(subscriptionId),
      'Подписка будет отключена, а оставшееся время сохранится.',
    );
  }

  async confirmPause(ctx: BotContext, subscriptionId: string) {
    const access = await this.accessHandler.ensureDealer(ctx);
    if (!access) {
      return;
    }

    await this.subscriptionsService.pauseSubscription(access.telegramId, subscriptionId);
    const view = ctx.session.subscriptionsView ?? { mode: 'all' as const, page: 1 };

    await renderMessage(
      ctx,
      BotText.success('Подписка поставлена на паузу.'),
      subscriptionActionSuccessKeyboard(view.mode, view.page),
    );
  }

  async askResumeConfirmation(ctx: BotContext, subscriptionId: string) {
    await this.askActionConfirmation(
      ctx,
      subscriptionId,
      'Возобновление подписки',
      callbackData.subscriptionResumeConfirm(subscriptionId),
      'Подписка снова станет активной, а срок будет пересчитан из сохраненного остатка.',
    );
  }

  async confirmResume(ctx: BotContext, subscriptionId: string) {
    const access = await this.accessHandler.ensureDealer(ctx);
    if (!access) {
      return;
    }

    await this.subscriptionsService.resumeSubscription(access.telegramId, subscriptionId);
    const view = ctx.session.subscriptionsView ?? { mode: 'all' as const, page: 1 };

    await renderMessage(
      ctx,
      BotText.success('Подписка возобновлена.'),
      subscriptionActionSuccessKeyboard(view.mode, view.page),
    );
  }

  async askDeleteConfirmation(ctx: BotContext, subscriptionId: string) {
    await this.askActionConfirmation(
      ctx,
      subscriptionId,
      'Удаление подписки',
      callbackData.subscriptionDeleteConfirm(subscriptionId),
      'Подписка будет удалена без возможности восстановления.',
    );
  }

  async confirmDelete(ctx: BotContext, subscriptionId: string) {
    const access = await this.accessHandler.ensureDealer(ctx);
    if (!access) {
      return;
    }

    await this.subscriptionsService.deleteSubscription(access.telegramId, subscriptionId);
    const view = ctx.session.subscriptionsView ?? { mode: 'all' as const, page: 1 };

    await renderMessage(
      ctx,
      BotText.success('Подписка удалена.'),
      subscriptionActionSuccessKeyboard(view.mode, view.page),
    );
  }

  private async handleCreateSubscriptionText(
    ctx: BotContext,
    flow: DealerCreateSubscriptionFlow,
  ) {
    const text = (ctx.message as { text?: string }).text?.trim() ?? '';

    if (flow.step === 'username') {
      const parsed = sanitizeUsername(text);
      if (!parsed.ok || !parsed.value) {
        await this.menuHandler.showFlowPrompt(
          ctx,
          parsed.error ?? 'Введите корректное имя пользователя.',
        );
        return;
      }

      setFlow(ctx, {
        type: BOT_FLOW.DEALER_CREATE_SUBSCRIPTION,
        step: 'days',
        data: {
          username: parsed.value,
        },
      });

      await this.menuHandler.showFlowPrompt(ctx, BotText.askSubscriptionDays());
      return;
    }

    if (flow.step === 'days') {
      const parsed = parsePositiveInt(text, 'Количество дней');
      if (!parsed.ok || parsed.value === undefined) {
        await this.menuHandler.showFlowPrompt(
          ctx,
          parsed.error ?? 'Введите количество дней еще раз.',
        );
        return;
      }

      setFlow(ctx, {
        type: BOT_FLOW.DEALER_CREATE_SUBSCRIPTION,
        step: 'confirm',
        data: {
          username: flow.data.username,
          days: parsed.value,
        },
      });

      await renderMessage(
        ctx,
        BotText.confirmCreateSubscription(flow.data.username!, parsed.value),
        createSubscriptionConfirmKeyboard(),
      );
      return;
    }

    await this.menuHandler.showFlowPrompt(
      ctx,
      'Проверьте данные и нажмите «Создать» или «Отмена».',
    );
  }

  private async handleSearchText(
    ctx: BotContext,
    _flow: DealerSearchSubscriptionFlow,
  ) {
    const text = (ctx.message as { text?: string }).text?.trim() ?? '';
    const parsed = sanitizeUsername(text);

    if (!parsed.ok || !parsed.value) {
      await this.menuHandler.showFlowPrompt(
        ctx,
        parsed.error ?? 'Введите корректный username.',
      );
      return;
    }

    clearFlow(ctx);
    setSubscriptionsView(ctx, {
      mode: 'search',
      page: 1,
      query: parsed.value,
    });

    await this.showSearchResults(ctx, 1);
  }

  private async askActionConfirmation(
    ctx: BotContext,
    subscriptionId: string,
    title: string,
    confirmData: string,
    description: string,
  ) {
    const access = await this.accessHandler.ensureDealer(ctx);
    if (!access) {
      return;
    }

    const subscription = await this.subscriptionsService.getSubscriptionForDealer(
      access.telegramId,
      subscriptionId,
    );

    await renderMessage(
      ctx,
      BotText.confirmSubscriptionAction(title, subscription, description),
      confirmationKeyboard(confirmData),
    );
  }
}
