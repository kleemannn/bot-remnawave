import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AddDealerDto } from '../../dealers/dto/add-dealer.dto';
import { DealersService } from '../../dealers/dealers.service';
import { BOT_UI } from '../constants/bot-ui.constants';
import { BotContext } from '../interfaces/bot-context.interface';
import { BotText } from '../messages/bot-text';
import { BOT_FLOW, AdminAddDealerFlow, AdminChangeExpirationFlow, AdminChangeLimitFlow, AdminChangeTagFlow, AdminDealerInfoFlow, AdminDeleteDealerFlow } from '../scenes/bot-scenes';
import { callbackData } from '../utils/callback-data.util';
import { formatDate } from '../utils/format.util';
import { parseExpirationDate, parseNonNegativeInt, parsePositiveInt, parseTelegramId, sanitizeUsername } from '../utils/input.util';
import { clearFlow, setDealersView, setFlow } from '../utils/session.util';
import {
  deleteMessageById,
  getCurrentMessageId,
  isCallbackContext,
  renderMessage,
} from '../utils/context.util';
import { BotAccessHandler } from './bot-access.handler';
import { MenuHandler } from './menu.handler';
import {
  adminSuccessKeyboard,
  dealersDeleteListKeyboard,
  adminTagKeyboard,
  dealerAdminCardKeyboard,
  dealersListKeyboard,
} from '../keyboards/admin.keyboards';
import { backToMenuKeyboard, confirmationKeyboard, inlineKeyboard, saveKeyboard } from '../keyboards/common.keyboards';
import { DealerTag } from '@prisma/client';
import { BotProtectionService } from '../services/bot-protection.service';

@Injectable()
export class AdminHandler {
  constructor(
    private readonly dealersService: DealersService,
    private readonly accessHandler: BotAccessHandler,
    private readonly menuHandler: MenuHandler,
    private readonly protectionService: BotProtectionService,
  ) {}

  async handleText(ctx: BotContext): Promise<boolean> {
    const flow = ctx.session.flow;
    if (!flow) {
      return false;
    }

    switch (flow.type) {
      case BOT_FLOW.ADMIN_ADD_DEALER:
        await this.handleAddDealerText(ctx, flow as AdminAddDealerFlow);
        return true;
      case BOT_FLOW.ADMIN_DELETE_DEALER:
        await this.handleDeleteDealerText(ctx, flow as AdminDeleteDealerFlow);
        return true;
      case BOT_FLOW.ADMIN_DEALER_INFO:
        await this.handleDealerInfoText(ctx, flow as AdminDealerInfoFlow);
        return true;
      case BOT_FLOW.ADMIN_CHANGE_TAG:
        await this.handleChangeTagText(ctx, flow as AdminChangeTagFlow);
        return true;
      case BOT_FLOW.ADMIN_CHANGE_LIMIT:
        await this.handleChangeLimitText(ctx, flow as AdminChangeLimitFlow);
        return true;
      case BOT_FLOW.ADMIN_CHANGE_EXPIRATION:
        await this.handleChangeExpirationText(
          ctx,
          flow as AdminChangeExpirationFlow,
        );
        return true;
      default:
        return false;
    }
  }

  async showAdminMenu(ctx: BotContext) {
    await this.menuHandler.showAdminMenu(ctx);
  }

  async showManagementMenu(ctx: BotContext) {
    await this.menuHandler.showAdminManagementMenu(ctx);
  }

  async startAddDealerFlow(ctx: BotContext) {
    if (!(await this.accessHandler.ensureAdmin(ctx))) {
      return;
    }

    setFlow(ctx, {
      type: BOT_FLOW.ADMIN_ADD_DEALER,
      step: 'telegramId',
      data: {},
    });

    await this.menuHandler.showFlowPrompt(
      ctx,
      BotText.askDealerTelegramId('добавить дилера'),
    );
  }

  async confirmAddDealer(ctx: BotContext) {
    const access = await this.accessHandler.ensureAdmin(ctx);
    if (!access) {
      return;
    }

    const flow = ctx.session.flow;
    if (
      !flow ||
      flow.type !== BOT_FLOW.ADMIN_ADD_DEALER ||
      flow.step !== 'confirm' ||
      !flow.data.telegramId ||
      !flow.data.username ||
      !flow.data.tag ||
      !flow.data.accessDays ||
      flow.data.keyLimit === undefined
    ) {
      await this.showAdminMenu(ctx);
      return;
    }

    const dto = plainToInstance(AddDealerDto, flow.data);
    const errors = await validate(dto);
    if (errors.length > 0) {
      await this.startAddDealerFlow(ctx);
      return;
    }

    await this.protectionService.runExpensiveAction(
      access.telegramId.toString(),
      `admin:add-dealer:${dto.telegramId}`,
      () => this.dealersService.addDealer(dto, access.telegramId),
    );
    clearFlow(ctx);

    await renderMessage(
      ctx,
      BotText.success('Дилер успешно добавлен.'),
      adminSuccessKeyboard(),
    );
  }

  async startDeleteDealerFlow(ctx: BotContext, telegramId?: string) {
    if (!(await this.accessHandler.ensureAdmin(ctx))) {
      return;
    }

    if (telegramId) {
      await this.askDeleteDealerConfirmation(ctx, telegramId);
      return;
    }

    clearFlow(ctx);
    await this.listDealersForDeletion(ctx, 1);
  }

  async confirmDeleteDealer(ctx: BotContext, telegramId: string) {
    const access = await this.accessHandler.ensureAdmin(ctx);
    if (!access) {
      return;
    }

    await this.protectionService.runExpensiveAction(
      access.telegramId.toString(),
      `admin:delete-dealer:${telegramId}`,
      () => this.dealersService.deleteDealer(BigInt(telegramId), access.telegramId),
    );
    clearFlow(ctx);

    await this.listDealersForDeletion(
      ctx,
      ctx.session.dealersView?.page ?? 1,
      BotText.success('Дилер удален. Выберите следующего из списка.'),
    );
  }

  async listDealers(ctx: BotContext, page = 1) {
    if (!(await this.accessHandler.ensureAdmin(ctx))) {
      return;
    }

    const pageResult = await this.dealersService.listDealers(page, BOT_UI.DEALERS_PAGE_SIZE);
    setDealersView(ctx, { page: pageResult.page });

    if (pageResult.total === 0) {
      await renderMessage(
        ctx,
        BotText.emptyDealers(),
        inlineKeyboard([
          [{ text: '➕ Добавить дилера', callback_data: callbackData.adminAddDealerStart }],
          [{ text: '🔙 В меню', callback_data: callbackData.adminMenu }],
        ]),
      );
      return;
    }

    await renderMessage(
      ctx,
      BotText.dealersList(pageResult.page, pageResult.pageCount),
      dealersListKeyboard(pageResult.items, pageResult.page, pageResult.pageCount),
    );
  }

  async showDealerCard(ctx: BotContext, telegramId: string) {
    if (!(await this.accessHandler.ensureAdmin(ctx))) {
      return;
    }

    const dealer = await this.dealersService.getDealerByTelegramId(BigInt(telegramId));
    if (!dealer) {
      await renderMessage(ctx, 'Дилер не найден.', backToMenuKeyboard());
      return;
    }

    await renderMessage(
      ctx,
      BotText.dealerCard(dealer),
      dealerAdminCardKeyboard(dealer, ctx.session.dealersView?.page ?? 1),
    );
  }

  async listDealersForDeletion(ctx: BotContext, page = 1, successMessage?: string) {
    if (!(await this.accessHandler.ensureAdmin(ctx))) {
      return;
    }

    const pageResult = await this.dealersService.listDealers(page, BOT_UI.DEALERS_PAGE_SIZE);
    setDealersView(ctx, { page: pageResult.page });

    if (pageResult.total === 0) {
      await renderMessage(
        ctx,
        successMessage
          ? `${successMessage}\n\n${BotText.emptyDealers()}`
          : BotText.emptyDealers(),
        inlineKeyboard([
          [{ text: '➕ Добавить дилера', callback_data: callbackData.adminAddDealerStart }],
          [{ text: '🔙 Назад', callback_data: callbackData.adminManagementMenu }],
          [{ text: '🔙 В меню', callback_data: callbackData.adminMenu }],
        ]),
      );
      return;
    }

    await renderMessage(
      ctx,
      successMessage
        ? `${successMessage}\n\n${BotText.deleteDealersList(
            pageResult.page,
            pageResult.pageCount,
          )}`
        : BotText.deleteDealersList(pageResult.page, pageResult.pageCount),
      dealersDeleteListKeyboard(
        pageResult.items,
        pageResult.page,
        pageResult.pageCount,
      ),
    );
  }

  async toggleDealerActive(ctx: BotContext, telegramId: string, active: boolean) {
    const access = await this.accessHandler.ensureAdmin(ctx);
    if (!access) {
      return;
    }

    await this.protectionService.runExpensiveAction(
      access.telegramId.toString(),
      `admin:toggle-dealer:${telegramId}:${active ? 'on' : 'off'}`,
      () => this.dealersService.setActive(BigInt(telegramId), active, access.telegramId),
    );
    await this.showDealerCard(ctx, telegramId);
  }

  async startDealerInfoFlow(ctx: BotContext) {
    if (!(await this.accessHandler.ensureAdmin(ctx))) {
      return;
    }

    setFlow(ctx, {
      type: BOT_FLOW.ADMIN_DEALER_INFO,
      step: 'telegramId',
      data: {},
    });

    await this.menuHandler.showFlowPrompt(
      ctx,
      BotText.askDealerTelegramId('посмотреть информацию'),
    );
  }

  async startChangeTagFlow(ctx: BotContext, telegramId?: string) {
    if (!(await this.accessHandler.ensureAdmin(ctx))) {
      return;
    }

    if (telegramId) {
      setFlow(ctx, {
        type: BOT_FLOW.ADMIN_CHANGE_TAG,
        step: 'tag',
        data: { telegramId },
      });

      await renderMessage(ctx, BotText.askTagSelection(), adminTagKeyboard());
      return;
    }

    setFlow(ctx, {
      type: BOT_FLOW.ADMIN_CHANGE_TAG,
      step: 'telegramId',
      data: {},
    });

    await this.menuHandler.showFlowPrompt(
      ctx,
      BotText.askDealerTelegramId('изменить тег'),
    );
  }

  async selectTag(ctx: BotContext, tag: DealerTag) {
    const access = await this.accessHandler.ensureAdmin(ctx);
    if (!access) {
      return;
    }

    const flow = ctx.session.flow;
    if (!flow) {
      await this.startChangeTagFlow(ctx);
      return;
    }

    if (flow.type === BOT_FLOW.ADMIN_ADD_DEALER) {
      setFlow(ctx, {
        type: BOT_FLOW.ADMIN_ADD_DEALER,
        step: 'accessDays',
        data: {
          ...flow.data,
          tag,
        },
      });

      await this.menuHandler.showFlowPrompt(ctx, BotText.askDealerAccessDays());
      return;
    }

    if (flow.type !== BOT_FLOW.ADMIN_CHANGE_TAG || !flow.data.telegramId) {
      await this.startChangeTagFlow(ctx);
      return;
    }

    setFlow(ctx, {
      type: BOT_FLOW.ADMIN_CHANGE_TAG,
      step: 'confirm',
      data: {
        telegramId: flow.data.telegramId,
        tag,
      },
    });

    await renderMessage(
      ctx,
      BotText.confirmTagChange(flow.data.telegramId, tag),
      saveKeyboard(callbackData.adminConfirmChangeTag),
    );
  }

  async confirmChangeTag(ctx: BotContext) {
    const access = await this.accessHandler.ensureAdmin(ctx);
    if (!access) {
      return;
    }

    const flow = ctx.session.flow;
    if (
      !flow ||
      flow.type !== BOT_FLOW.ADMIN_CHANGE_TAG ||
      flow.step !== 'confirm' ||
      !flow.data.telegramId ||
      !flow.data.tag
    ) {
      await this.showAdminMenu(ctx);
      return;
    }

    await this.protectionService.runExpensiveAction(
      access.telegramId.toString(),
      `admin:set-tag:${flow.data.telegramId}:${flow.data.tag}`,
      () => this.dealersService.setTag(
        BigInt(flow.data.telegramId!),
        flow.data.tag!,
        access.telegramId,
      ),
    );
    clearFlow(ctx);

    await renderMessage(
      ctx,
      BotText.success('Тег дилера обновлен.'),
      adminSuccessKeyboard(),
    );
  }

  async startChangeLimitFlow(ctx: BotContext, telegramId?: string) {
    if (!(await this.accessHandler.ensureAdmin(ctx))) {
      return;
    }

    if (telegramId) {
      setFlow(ctx, {
        type: BOT_FLOW.ADMIN_CHANGE_LIMIT,
        step: 'keyLimit',
        data: { telegramId },
      });

      await this.menuHandler.showFlowPrompt(ctx, BotText.askDealerLimit());
      return;
    }

    setFlow(ctx, {
      type: BOT_FLOW.ADMIN_CHANGE_LIMIT,
      step: 'telegramId',
      data: {},
    });

    await this.menuHandler.showFlowPrompt(
      ctx,
      BotText.askDealerTelegramId('изменить лимит'),
    );
  }

  async confirmChangeLimit(ctx: BotContext) {
    const access = await this.accessHandler.ensureAdmin(ctx);
    if (!access) {
      return;
    }

    const flow = ctx.session.flow;
    if (
      !flow ||
      flow.type !== BOT_FLOW.ADMIN_CHANGE_LIMIT ||
      flow.step !== 'confirm' ||
      !flow.data.telegramId ||
      flow.data.keyLimit === undefined
    ) {
      await this.showAdminMenu(ctx);
      return;
    }

    await this.protectionService.runExpensiveAction(
      access.telegramId.toString(),
      `admin:set-limit:${flow.data.telegramId}:${flow.data.keyLimit}`,
      () => this.dealersService.setKeyLimit(
        BigInt(flow.data.telegramId!),
        flow.data.keyLimit!,
        access.telegramId,
      ),
    );
    clearFlow(ctx);

    await renderMessage(
      ctx,
      BotText.success('Лимит дилера обновлен.'),
      adminSuccessKeyboard(),
    );
  }

  async startChangeExpirationFlow(ctx: BotContext, telegramId?: string) {
    if (!(await this.accessHandler.ensureAdmin(ctx))) {
      return;
    }

    if (telegramId) {
      setFlow(ctx, {
        type: BOT_FLOW.ADMIN_CHANGE_EXPIRATION,
        step: 'expiresAt',
        data: { telegramId },
      });

      await this.menuHandler.showFlowPrompt(ctx, BotText.askDealerExpiration());
      return;
    }

    setFlow(ctx, {
      type: BOT_FLOW.ADMIN_CHANGE_EXPIRATION,
      step: 'telegramId',
      data: {},
    });

    await this.menuHandler.showFlowPrompt(
      ctx,
      BotText.askDealerTelegramId('изменить срок доступа'),
    );
  }

  async confirmChangeExpiration(ctx: BotContext) {
    const access = await this.accessHandler.ensureAdmin(ctx);
    if (!access) {
      return;
    }

    const flow = ctx.session.flow;
    if (
      !flow ||
      flow.type !== BOT_FLOW.ADMIN_CHANGE_EXPIRATION ||
      flow.step !== 'confirm' ||
      !flow.data.telegramId ||
      !flow.data.expiresAtIso
    ) {
      await this.showAdminMenu(ctx);
      return;
    }

    await this.protectionService.runExpensiveAction(
      access.telegramId.toString(),
      `admin:set-expiration:${flow.data.telegramId}:${flow.data.expiresAtIso}`,
      () => this.dealersService.setExpiresAt(
        BigInt(flow.data.telegramId!),
        new Date(flow.data.expiresAtIso!),
        access.telegramId,
      ),
    );
    clearFlow(ctx);

    await renderMessage(
      ctx,
      BotText.success('Срок доступа дилера обновлен.'),
      adminSuccessKeyboard(),
    );
  }

  async showStats(ctx: BotContext) {
    if (!(await this.accessHandler.ensureAdmin(ctx))) {
      return;
    }

    const stats = await this.dealersService.getStats();
    await renderMessage(
      ctx,
      BotText.stats(stats),
      inlineKeyboard([
        [{ text: '👨‍💼 Дилеры', callback_data: callbackData.adminDealersList(1) }],
        [{ text: '🔙 В меню', callback_data: callbackData.adminMenu }],
      ]),
    );
  }

  async askDeleteDealerConfirmation(ctx: BotContext, telegramId: string) {
    if (!(await this.accessHandler.ensureAdmin(ctx))) {
      return;
    }

    clearFlow(ctx);

    const dealer = await this.dealersService.getDealerByTelegramId(BigInt(telegramId));
    if (!dealer) {
      await renderMessage(ctx, 'Дилер не найден.', backToMenuKeyboard());
      return;
    }

    await renderMessage(
      ctx,
      BotText.confirmDealerDeletion(dealer),
      confirmationKeyboard(callbackData.adminConfirmDeleteDealer(telegramId)),
    );
  }

  private async handleAddDealerText(ctx: BotContext, flow: AdminAddDealerFlow) {
    const text = (ctx.message as { text?: string }).text?.trim() ?? '';
    await this.deleteCurrentUserMessage(ctx);

    if (flow.step === 'telegramId') {
      const parsed = parseTelegramId(text);
      if (!parsed.ok || !parsed.value) {
        await this.menuHandler.showFlowPrompt(ctx, parsed.error ?? 'Введите Telegram ID.');
        return;
      }

      setFlow(ctx, {
        type: BOT_FLOW.ADMIN_ADD_DEALER,
        step: 'username',
        data: { telegramId: parsed.value },
      });

      await this.menuHandler.showFlowPrompt(ctx, BotText.askDealerUsername());
      return;
    }

    if (flow.step === 'username') {
      const parsed = sanitizeUsername(text);
      if (!parsed.ok || !parsed.value) {
        await this.menuHandler.showFlowPrompt(
          ctx,
          parsed.error ?? 'Введите username дилера еще раз.',
        );
        return;
      }

      setFlow(ctx, {
        type: BOT_FLOW.ADMIN_ADD_DEALER,
        step: 'tag',
        data: {
          ...flow.data,
          username: parsed.value,
        },
      });

      await renderMessage(ctx, BotText.askTagSelection(), adminTagKeyboard());
      return;
    }

    if (flow.step === 'accessDays') {
      const parsed = parsePositiveInt(text, 'Срок доступа');
      if (!parsed.ok || parsed.value === undefined) {
        await this.menuHandler.showFlowPrompt(ctx, parsed.error ?? 'Введите срок доступа.');
        return;
      }

      setFlow(ctx, {
        type: BOT_FLOW.ADMIN_ADD_DEALER,
        step: 'keyLimit',
        data: {
          ...flow.data,
          accessDays: parsed.value,
        },
      });

      await this.menuHandler.showFlowPrompt(ctx, BotText.askDealerLimit());
      return;
    }

    if (flow.step === 'keyLimit') {
      const parsed = parseNonNegativeInt(text, 'Лимит ключей');
      if (!parsed.ok || parsed.value === undefined) {
        await this.menuHandler.showFlowPrompt(ctx, parsed.error ?? 'Введите лимит.');
        return;
      }

      setFlow(ctx, {
        type: BOT_FLOW.ADMIN_ADD_DEALER,
        step: 'confirm',
        data: {
          ...flow.data,
          keyLimit: parsed.value,
        },
      });

      await renderMessage(
        ctx,
        BotText.confirmAddDealer({
          telegramId: flow.data.telegramId!,
          username: flow.data.username!,
          tag: flow.data.tag!,
          accessDays: flow.data.accessDays!,
          keyLimit: parsed.value,
        }),
        saveKeyboard(callbackData.adminConfirmAddDealer),
      );
      return;
    }

    if (flow.step === 'tag') {
      await renderMessage(ctx, BotText.askTagSelection(), adminTagKeyboard());
      return;
    }

    await this.menuHandler.showFlowPrompt(
      ctx,
      'Проверьте данные и нажмите «Сохранить» или «Отмена».',
    );
  }

  private async deleteCurrentUserMessage(ctx: BotContext) {
    if (isCallbackContext(ctx)) {
      return;
    }

    const messageId = getCurrentMessageId(ctx);
    if (typeof messageId !== 'number') {
      return;
    }

    await deleteMessageById(ctx, messageId);
  }

  private async handleDeleteDealerText(ctx: BotContext, _flow: AdminDeleteDealerFlow) {
    const text = (ctx.message as { text?: string }).text?.trim() ?? '';
    const parsed = parseTelegramId(text);

    if (!parsed.ok || !parsed.value) {
      await this.menuHandler.showFlowPrompt(ctx, parsed.error ?? 'Введите Telegram ID.');
      return;
    }

    await this.askDeleteDealerConfirmation(ctx, parsed.value);
  }

  private async handleDealerInfoText(ctx: BotContext, _flow: AdminDealerInfoFlow) {
    const text = (ctx.message as { text?: string }).text?.trim() ?? '';
    const parsed = parseTelegramId(text);

    if (!parsed.ok || !parsed.value) {
      await this.menuHandler.showFlowPrompt(ctx, parsed.error ?? 'Введите Telegram ID.');
      return;
    }

    clearFlow(ctx);
    await this.showDealerCard(ctx, parsed.value);
  }

  private async handleChangeTagText(ctx: BotContext, flow: AdminChangeTagFlow) {
    const text = (ctx.message as { text?: string }).text?.trim() ?? '';

    if (flow.step === 'telegramId') {
      const parsed = parseTelegramId(text);
      if (!parsed.ok || !parsed.value) {
        await this.menuHandler.showFlowPrompt(ctx, parsed.error ?? 'Введите Telegram ID.');
        return;
      }
      const dealer = await this.dealersService.getDealerByTelegramId(BigInt(parsed.value));
      if (!dealer) {
        await this.menuHandler.showFlowPrompt(
          ctx,
          'Дилер не найден. Проверьте Telegram ID и попробуйте снова.',
        );
        return;
      }

      setFlow(ctx, {
        type: BOT_FLOW.ADMIN_CHANGE_TAG,
        step: 'tag',
        data: { telegramId: parsed.value },
      });

      await renderMessage(ctx, BotText.askTagSelection(), adminTagKeyboard());
      return;
    }

    await renderMessage(ctx, BotText.askTagSelection(), adminTagKeyboard());
  }

  private async handleChangeLimitText(ctx: BotContext, flow: AdminChangeLimitFlow) {
    const text = (ctx.message as { text?: string }).text?.trim() ?? '';

    if (flow.step === 'telegramId') {
      const parsed = parseTelegramId(text);
      if (!parsed.ok || !parsed.value) {
        await this.menuHandler.showFlowPrompt(ctx, parsed.error ?? 'Введите Telegram ID.');
        return;
      }
      const dealer = await this.dealersService.getDealerByTelegramId(BigInt(parsed.value));
      if (!dealer) {
        await this.menuHandler.showFlowPrompt(
          ctx,
          'Дилер не найден. Проверьте Telegram ID и попробуйте снова.',
        );
        return;
      }

      setFlow(ctx, {
        type: BOT_FLOW.ADMIN_CHANGE_LIMIT,
        step: 'keyLimit',
        data: { telegramId: parsed.value },
      });

      await this.menuHandler.showFlowPrompt(ctx, BotText.askDealerLimit());
      return;
    }

    if (flow.step === 'keyLimit') {
      const parsed = parseNonNegativeInt(text, 'Лимит ключей');
      if (!parsed.ok || parsed.value === undefined) {
        await this.menuHandler.showFlowPrompt(ctx, parsed.error ?? 'Введите лимит.');
        return;
      }

      setFlow(ctx, {
        type: BOT_FLOW.ADMIN_CHANGE_LIMIT,
        step: 'confirm',
        data: {
          ...flow.data,
          keyLimit: parsed.value,
        },
      });

      await renderMessage(
        ctx,
        BotText.confirmLimitChange(flow.data.telegramId!, parsed.value),
        saveKeyboard(callbackData.adminConfirmChangeLimit),
      );
      return;
    }

    await this.menuHandler.showFlowPrompt(
      ctx,
      'Проверьте данные и нажмите «Сохранить» или «Отмена».',
    );
  }

  private async handleChangeExpirationText(
    ctx: BotContext,
    flow: AdminChangeExpirationFlow,
  ) {
    const text = (ctx.message as { text?: string }).text?.trim() ?? '';

    if (flow.step === 'telegramId') {
      const parsed = parseTelegramId(text);
      if (!parsed.ok || !parsed.value) {
        await this.menuHandler.showFlowPrompt(ctx, parsed.error ?? 'Введите Telegram ID.');
        return;
      }
      const dealer = await this.dealersService.getDealerByTelegramId(BigInt(parsed.value));
      if (!dealer) {
        await this.menuHandler.showFlowPrompt(
          ctx,
          'Дилер не найден. Проверьте Telegram ID и попробуйте снова.',
        );
        return;
      }

      setFlow(ctx, {
        type: BOT_FLOW.ADMIN_CHANGE_EXPIRATION,
        step: 'expiresAt',
        data: { telegramId: parsed.value },
      });

      await this.menuHandler.showFlowPrompt(ctx, BotText.askDealerExpiration());
      return;
    }

    if (flow.step === 'expiresAt') {
      const parsed = parseExpirationDate(text);
      if (!parsed.ok || !parsed.value) {
        await this.menuHandler.showFlowPrompt(ctx, parsed.error ?? 'Введите дату еще раз.');
        return;
      }

      setFlow(ctx, {
        type: BOT_FLOW.ADMIN_CHANGE_EXPIRATION,
        step: 'confirm',
        data: {
          ...flow.data,
          expiresAtIso: parsed.value.toISOString(),
        },
      });

      await renderMessage(
        ctx,
        BotText.confirmExpirationChange(
          flow.data.telegramId!,
          formatDate(parsed.value),
        ),
        saveKeyboard(callbackData.adminConfirmChangeExpiration),
      );
      return;
    }

    await this.menuHandler.showFlowPrompt(
      ctx,
      'Проверьте дату и нажмите «Сохранить» или «Отмена».',
    );
  }
}
