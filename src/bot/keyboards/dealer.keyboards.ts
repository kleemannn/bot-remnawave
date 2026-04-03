import { callbackData } from '../utils/callback-data.util';
import { Button, inlineKeyboard } from './common.keyboards';

export function dealerMainMenuKeyboard(isDealer: boolean, isAdmin: boolean) {
  const rows: Button[][] = [];

  if (isDealer) {
    rows.push(
      [
        { text: '📦 Создать', callback_data: callbackData.dealerCreateStart },
        { text: '📋 Мои подписки', callback_data: callbackData.subscriptionsList(1) },
      ],
      [
        { text: '🔍 Поиск', callback_data: callbackData.dealerSearchStart },
        { text: '👤 Профиль', callback_data: callbackData.dealerProfile },
      ],
    );
  }

  if (isAdmin) {
    rows.splice(2, 0, [
      { text: '⚙️ Админ-панель', callback_data: callbackData.adminMenu },
    ]);
  }

  rows.push([{ text: '❓ Помощь', callback_data: callbackData.help }]);

  return inlineKeyboard(rows);
}

export function dealerAfterCreateKeyboard(subscriptionId: string, hasLink: boolean) {
  const rows: Button[][] = [];

  if (hasLink) {
    rows.push([
      {
        text: '📋 Показать ключ',
        callback_data: callbackData.dealerCreatedLink(subscriptionId),
      },
    ]);
  }

  rows.push(
    [
      { text: '📦 Создать ещё', callback_data: callbackData.dealerCreateStart },
      { text: '📋 Мои подписки', callback_data: callbackData.subscriptionsList(1) },
    ],
    [{ text: '🔙 В меню', callback_data: callbackData.mainMenu }],
  );

  return inlineKeyboard([
    ...rows,
  ]);
}

export function dealerHelpKeyboard() {
  return inlineKeyboard([
    [{ text: '📦 Создать', callback_data: callbackData.dealerCreateStart }],
    [{ text: '📋 Мои подписки', callback_data: callbackData.subscriptionsList(1) }],
    [{ text: '🔙 В меню', callback_data: callbackData.mainMenu }],
  ]);
}
