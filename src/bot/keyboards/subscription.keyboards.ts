import { SubscriptionStatus } from '@prisma/client';
import { buildPaginationRow } from '../pagination/pagination.util';
import { callbackData } from '../utils/callback-data.util';
import { formatSubscriptionStatusLabel } from '../formatters/status.formatter';
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
    [{ text: '✅ Создать', callback_data: callbackData.dealerCreateConfirm }],
    [{ text: '❌ Отмена', callback_data: callbackData.cancelFlow }],
  ]);
}

export function createSubscriptionDaysKeyboard() {
  return inlineKeyboard([
    [
      { text: '7 дней', callback_data: callbackData.dealerCreateDays(7) },
      { text: '30 дней', callback_data: callbackData.dealerCreateDays(30) },
    ],
    [{ text: '❌ Отмена', callback_data: callbackData.cancelFlow }],
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
      text: `👤 ${item.dealerUser.username} • ${statusChip(item.status)}`,
      callback_data: callbackData.subscriptionCard(item.id),
    },
  ]);

  const paginationRow = buildPaginationRow({
    page,
    pageCount,
    prevCallback:
      mode === 'search'
        ? callbackData.subscriptionsSearchResults(page - 1)
        : callbackData.subscriptionsList(page - 1),
    nextCallback:
      mode === 'search'
        ? callbackData.subscriptionsSearchResults(page + 1)
        : callbackData.subscriptionsList(page + 1),
    refreshCallback:
      mode === 'search'
        ? callbackData.subscriptionsSearchResults(page)
        : callbackData.subscriptionsList(page),
  });

  if (paginationRow.length > 0) {
    rows.push(paginationRow);
  }

  rows.push([{ text: '🔙 В меню', callback_data: callbackData.mainMenu }]);

  return inlineKeyboard(rows);
}

export function subscriptionCardKeyboard(
  subscriptionId: string,
  status: SubscriptionStatus,
  mode: 'all' | 'search',
  page: number,
) {
  const rows: Button[][] = [];

  if (status !== SubscriptionStatus.DELETED) {
    rows.push([
      {
        text: '📋 Ключ',
        callback_data: callbackData.subscriptionLink(subscriptionId),
      },
    ]);
  }

  if (status === SubscriptionStatus.ACTIVE) {
    rows.push([
      {
        text: '⏸ Пауза',
        callback_data: callbackData.subscriptionPauseAsk(subscriptionId),
      },
    ]);
  }

  if (status === SubscriptionStatus.PAUSED) {
    rows.push([
      {
        text: '▶️ Возобновить',
        callback_data: callbackData.subscriptionResumeAsk(subscriptionId),
      },
    ]);
  }

  if (status !== SubscriptionStatus.DELETED) {
    rows.push([
      {
        text: '🗑 Удалить',
        callback_data: callbackData.subscriptionDeleteAsk(subscriptionId),
      },
    ]);
  }

  rows.push([
    {
      text: '🔙 Назад',
      callback_data:
        mode === 'search'
          ? callbackData.subscriptionsSearchResults(page)
          : callbackData.subscriptionsList(page),
    },
  ]);
  rows.push([{ text: '🔙 В меню', callback_data: callbackData.mainMenu }]);

  return inlineKeyboard(rows);
}

export function subscriptionActionSuccessKeyboard(mode: 'all' | 'search', page: number) {
  return inlineKeyboard([
    [
      {
        text: '📋 К списку',
        callback_data:
          mode === 'search'
            ? callbackData.subscriptionsSearchResults(page)
            : callbackData.subscriptionsList(page),
      },
    ],
    [{ text: '🔙 В меню', callback_data: callbackData.mainMenu }],
  ]);
}

function statusChip(status: SubscriptionStatus): string {
  return formatSubscriptionStatusLabel({
    status,
    expiresAt: new Date(Date.now() + 60_000),
  });
}
