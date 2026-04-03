import { DealerTag } from '@prisma/client';
import { callbackData } from '../utils/callback-data.util';
import { Button, inlineKeyboard } from './common.keyboards';

interface DealerListItem {
  telegramId: bigint;
  username: string | null;
  tag: DealerTag;
}

export function adminMainMenuKeyboard() {
  return inlineKeyboard([
    [
      { text: 'Добавить дилера', callback_data: callbackData.adminAddDealerStart },
      { text: 'Удалить дилера', callback_data: callbackData.adminDeleteDealerStart },
    ],
    [
      { text: 'Список дилеров', callback_data: callbackData.adminDealersList(1) },
      { text: 'Инфо по дилеру', callback_data: callbackData.adminDealerInfoStart },
    ],
    [
      { text: 'Изменить тег', callback_data: callbackData.adminChangeTagStart },
      { text: 'Изменить лимит', callback_data: callbackData.adminChangeLimitStart },
    ],
    [
      {
        text: 'Изменить срок доступа',
        callback_data: callbackData.adminChangeExpirationStart,
      },
      { text: 'Статистика', callback_data: callbackData.adminStats },
    ],
    [{ text: 'Назад в меню', callback_data: callbackData.mainMenu }],
  ]);
}

export function adminTagKeyboard() {
  return inlineKeyboard([
    [
      { text: 'Standard', callback_data: callbackData.adminTagSelect('STANDARD') },
      { text: 'Premium', callback_data: callbackData.adminTagSelect('PREMIUM') },
    ],
    [{ text: 'Отмена', callback_data: callbackData.cancelFlow }],
  ]);
}

export function dealersListKeyboard(items: DealerListItem[], page: number, pageCount: number) {
  const rows: Button[][] = items.map((item) => [
    {
      text: `${item.username ?? 'Без username'} • ${item.tag.toLowerCase()}`,
      callback_data: callbackData.adminDealerCard(item.telegramId.toString()),
    },
  ]);

  const paginationRow: Button[] = [];
  if (page > 1) {
    paginationRow.push({
      text: '← Назад',
      callback_data: callbackData.adminDealersList(page - 1),
    });
  }
  if (page < pageCount) {
    paginationRow.push({
      text: 'Вперед →',
      callback_data: callbackData.adminDealersList(page + 1),
    });
  }
  if (paginationRow.length > 0) {
    rows.push(paginationRow);
  }

  rows.push([{ text: 'Назад в меню', callback_data: callbackData.adminMenu }]);

  return inlineKeyboard(rows);
}

export function dealerAdminCardKeyboard(telegramId: string) {
  return inlineKeyboard([
    [
      {
        text: 'Изменить тег',
        callback_data: callbackData.adminChangeTagForDealer(telegramId),
      },
      {
        text: 'Изменить лимит',
        callback_data: callbackData.adminChangeLimitForDealer(telegramId),
      },
    ],
    [
      {
        text: 'Изменить срок доступа',
        callback_data: callbackData.adminChangeExpirationForDealer(telegramId),
      },
      {
        text: 'Удалить дилера',
        callback_data: callbackData.adminDeleteDealerAsk(telegramId),
      },
    ],
    [{ text: 'К списку дилеров', callback_data: callbackData.adminDealersList(1) }],
    [{ text: 'Назад в меню', callback_data: callbackData.adminMenu }],
  ]);
}

export function adminSuccessKeyboard() {
  return inlineKeyboard([
    [{ text: 'Список дилеров', callback_data: callbackData.adminDealersList(1) }],
    [{ text: 'Назад в меню', callback_data: callbackData.adminMenu }],
  ]);
}
