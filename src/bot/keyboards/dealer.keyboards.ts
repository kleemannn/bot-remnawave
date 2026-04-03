import { callbackData } from '../utils/callback-data.util';
import { Button, inlineKeyboard } from './common.keyboards';

export function dealerMainMenuKeyboard(isDealer: boolean, isAdmin: boolean) {
  const rows: Button[][] = [];

  if (isDealer) {
    rows.push(
      [
        { text: 'Создать подписку', callback_data: callbackData.dealerCreateStart },
        { text: 'Мои подписки', callback_data: callbackData.subscriptionsList(1) },
      ],
      [
        { text: 'Найти подписку', callback_data: callbackData.dealerSearchStart },
        { text: 'Мой профиль', callback_data: callbackData.dealerProfile },
      ],
    );
  }

  if (isAdmin) {
    rows.splice(2, 0, [
      { text: 'Админ-меню', callback_data: callbackData.adminMenu },
    ]);
  }

  rows.push([{ text: 'Помощь', callback_data: callbackData.help }]);

  return inlineKeyboard(rows);
}

export function dealerAfterCreateKeyboard() {
  return inlineKeyboard([
    [
      { text: 'Создать еще', callback_data: callbackData.dealerCreateStart },
      { text: 'Мои подписки', callback_data: callbackData.subscriptionsList(1) },
    ],
    [{ text: 'Назад в меню', callback_data: callbackData.mainMenu }],
  ]);
}

export function dealerHelpKeyboard() {
  return inlineKeyboard([
    [{ text: 'Создать подписку', callback_data: callbackData.dealerCreateStart }],
    [{ text: 'Мои подписки', callback_data: callbackData.subscriptionsList(1) }],
    [{ text: 'Назад в меню', callback_data: callbackData.mainMenu }],
  ]);
}
