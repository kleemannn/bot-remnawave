import { SubscriptionStatus } from '@prisma/client';
import { callbackData } from '../utils/callback-data.util';
import { Button, inlineKeyboard } from './common.keyboards';

interface SubscriptionListItem {
  id: string;
  dealerUser: {
    username: string;
  };
  status: SubscriptionStatus;
}

export function createSubscriptionConfirmKeyboard() {
  return inlineKeyboard([
    [{ text: 'Создать', callback_data: callbackData.dealerCreateConfirm }],
    [{ text: 'Отмена', callback_data: callbackData.cancelFlow }],
  ]);
}

export function subscriptionsListKeyboard(
  items: SubscriptionListItem[],
  page: number,
  pageCount: number,
  mode: 'all' | 'search',
) {
  const rows: Button[][] = items.map((item) => [
    {
      text: `${item.dealerUser.username} • ${statusChip(item.status)}`,
      callback_data: callbackData.subscriptionCard(item.id),
    },
  ]);

  const paginationRow: Button[] = [];
  if (page > 1) {
    paginationRow.push({
      text: '← Назад',
      callback_data:
        mode === 'search'
          ? callbackData.subscriptionsSearchResults(page - 1)
          : callbackData.subscriptionsList(page - 1),
    });
  }

  if (page < pageCount) {
    paginationRow.push({
      text: 'Вперед →',
      callback_data:
        mode === 'search'
          ? callbackData.subscriptionsSearchResults(page + 1)
          : callbackData.subscriptionsList(page + 1),
    });
  }

  if (paginationRow.length > 0) {
    rows.push(paginationRow);
  }

  rows.push([{ text: 'Назад в меню', callback_data: callbackData.mainMenu }]);

  return inlineKeyboard(rows);
}

export function subscriptionCardKeyboard(
  subscriptionId: string,
  status: SubscriptionStatus,
  mode: 'all' | 'search',
  page: number,
) {
  const rows: Button[][] = [];

  if (status === SubscriptionStatus.ACTIVE) {
    rows.push([
      {
        text: 'Пауза',
        callback_data: callbackData.subscriptionPauseAsk(subscriptionId),
      },
    ]);
  }

  if (status === SubscriptionStatus.PAUSED) {
    rows.push([
      {
        text: 'Возобновить',
        callback_data: callbackData.subscriptionResumeAsk(subscriptionId),
      },
    ]);
  }

  if (status !== SubscriptionStatus.DELETED) {
    rows.push([
      {
        text: 'Удалить',
        callback_data: callbackData.subscriptionDeleteAsk(subscriptionId),
      },
    ]);
  }

  rows.push([
    {
      text: 'Назад',
      callback_data:
        mode === 'search'
          ? callbackData.subscriptionsSearchResults(page)
          : callbackData.subscriptionsList(page),
    },
  ]);
  rows.push([{ text: 'Назад в меню', callback_data: callbackData.mainMenu }]);

  return inlineKeyboard(rows);
}

export function subscriptionActionSuccessKeyboard(mode: 'all' | 'search', page: number) {
  return inlineKeyboard([
    [
      {
        text: 'К списку',
        callback_data:
          mode === 'search'
            ? callbackData.subscriptionsSearchResults(page)
            : callbackData.subscriptionsList(page),
      },
    ],
    [{ text: 'Назад в меню', callback_data: callbackData.mainMenu }],
  ]);
}

function statusChip(status: SubscriptionStatus): string {
  switch (status) {
    case SubscriptionStatus.ACTIVE:
      return 'Активна';
    case SubscriptionStatus.PAUSED:
      return 'Пауза';
    case SubscriptionStatus.DELETED:
      return 'Удалена';
    default:
      return status;
  }
}
