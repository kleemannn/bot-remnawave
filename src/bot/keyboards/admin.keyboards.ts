import { Dealer, DealerTag } from '@prisma/client';
import { buildPaginationRow } from '../pagination/pagination.util';
import { callbackData } from '../utils/callback-data.util';
import { formatDealerTagLabel } from '../formatters/status.formatter';
import { Button, inlineKeyboard } from './common.keyboards';

interface DealerListItem {
  telegramId: bigint;
  username: string | null;
  tag: DealerTag;
}

export function adminMainMenuKeyboard() {
  return inlineKeyboard([
    [
      { text: '👨‍💼 Дилеры', callback_data: callbackData.adminDealersList(1) },
      { text: '➕ Добавить дилера', callback_data: callbackData.adminAddDealerStart },
    ],
    [
      { text: '📊 Статистика', callback_data: callbackData.adminStats },
      { text: '⚙️ Управление', callback_data: callbackData.adminManagementMenu },
    ],
    [
      { text: '❓ Помощь', callback_data: callbackData.help },
      { text: '🔙 В меню', callback_data: callbackData.mainMenu },
    ],
  ]);
}

export function adminManagementKeyboard() {
  return inlineKeyboard([
    [
      { text: '🏷 Изменить тег', callback_data: callbackData.adminChangeTagStart },
      { text: '🔑 Изменить лимит', callback_data: callbackData.adminChangeLimitStart },
    ],
    [
      {
        text: '📅 Изменить срок',
        callback_data: callbackData.adminChangeExpirationStart,
      },
      { text: 'ℹ️ Инфо по дилеру', callback_data: callbackData.adminDealerInfoStart },
    ],
    [
      { text: '🗑 Удалить дилера', callback_data: callbackData.adminDeleteDealerStart },
      { text: '👨‍💼 К списку', callback_data: callbackData.adminDealersList(1) },
    ],
    [{ text: '🔙 Назад', callback_data: callbackData.adminMenu }],
  ]);
}

export function adminTagKeyboard() {
  return inlineKeyboard([
    [
      { text: '🏷 Standard', callback_data: callbackData.adminTagSelect('STANDARD') },
      { text: '🏷 Premium', callback_data: callbackData.adminTagSelect('PREMIUM') },
    ],
    [{ text: '❌ Отмена', callback_data: callbackData.cancelFlow }],
  ]);
}

export function dealersListKeyboard(items: DealerListItem[], page: number, pageCount: number) {
  const rows: Button[][] = items.map((item) => [
    {
      text: `👨‍💼 ${item.username ?? 'Без username'} • ${formatDealerTagLabel(item.tag)}`,
      callback_data: callbackData.adminDealerCard(item.telegramId.toString()),
    },
  ]);

  const paginationRow = buildPaginationRow({
    page,
    pageCount,
    prevCallback: callbackData.adminDealersList(page - 1),
    nextCallback: callbackData.adminDealersList(page + 1),
    refreshCallback: callbackData.adminDealersList(page),
  });
  if (paginationRow.length > 0) {
    rows.push(paginationRow);
  }

  rows.push([{ text: '🔙 В меню', callback_data: callbackData.adminMenu }]);

  return inlineKeyboard(rows);
}

export function dealerAdminCardKeyboard(dealer: Dealer, page: number) {
  const toggleLabel = dealer.isActive ? '🚫 Отключить' : '✅ Активировать';
  const toggleCallback = callbackData.adminDealerToggleActive(
    dealer.telegramId.toString(),
    dealer.isActive ? 'off' : 'on',
  );

  return inlineKeyboard([
    [
      {
        text: '🏷 Изменить тег',
        callback_data: callbackData.adminChangeTagForDealer(dealer.telegramId.toString()),
      },
      {
        text: '🔑 Изменить лимит',
        callback_data: callbackData.adminChangeLimitForDealer(dealer.telegramId.toString()),
      },
    ],
    [
      {
        text: '📅 Изменить срок',
        callback_data: callbackData.adminChangeExpirationForDealer(
          dealer.telegramId.toString(),
        ),
      },
      { text: toggleLabel, callback_data: toggleCallback },
    ],
    [
      {
        text: '🗑 Удалить',
        callback_data: callbackData.adminDeleteDealerAsk(dealer.telegramId.toString()),
      },
    ],
    [{ text: '🔙 Назад', callback_data: callbackData.adminDealersList(page) }],
    [{ text: '🔙 В меню', callback_data: callbackData.adminMenu }],
  ]);
}

export function adminSuccessKeyboard() {
  return inlineKeyboard([
    [{ text: '👨‍💼 Дилеры', callback_data: callbackData.adminDealersList(1) }],
    [{ text: '⚙️ Управление', callback_data: callbackData.adminManagementMenu }],
    [{ text: '🔙 В меню', callback_data: callbackData.adminMenu }],
  ]);
}
