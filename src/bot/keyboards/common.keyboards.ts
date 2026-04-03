import { callbackData } from '../utils/callback-data.util';

export type Button = { text: string; callback_data: string };

function row(...buttons: Button[]) {
  return buttons;
}

export function inlineKeyboard(rows: Button[][]): Record<string, unknown> {
  return {
    reply_markup: {
      inline_keyboard: rows,
    },
  };
}

export function cancelKeyboard() {
  return inlineKeyboard([[{ text: '❌ Отмена', callback_data: callbackData.cancelFlow }]]);
}

export function backToMenuKeyboard() {
  return inlineKeyboard([
    [{ text: '🔙 В меню', callback_data: callbackData.mainMenu }],
  ]);
}

export function confirmationKeyboard(confirmData: string) {
  return inlineKeyboard([
    row({ text: '✅ Подтвердить', callback_data: confirmData }),
    row({ text: '❌ Отмена', callback_data: callbackData.cancelFlow }),
  ]);
}

export function saveKeyboard(confirmData: string) {
  return inlineKeyboard([
    row({ text: '✅ Сохранить', callback_data: confirmData }),
    row({ text: '❌ Отмена', callback_data: callbackData.cancelFlow }),
  ]);
}
