import { DealerTag } from '@prisma/client';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

export interface ParsedInput<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

export function sanitizeUsername(input: string): ParsedInput<string> {
  const sanitized = input.trim().replace(/^@+/, '').replace(/\s+/g, '');

  if (!sanitized) {
    return {
      ok: false,
      error: 'Имя пользователя не может быть пустым. Введите username еще раз.',
    };
  }

  if (!/^[A-Za-z0-9_.-]{3,64}$/.test(sanitized)) {
    return {
      ok: false,
      error:
        'Некорректный username. Используйте только латинские буквы, цифры, ".", "_" или "-". Длина от 3 до 64 символов.',
    };
  }

  return { ok: true, value: sanitized };
}

export function parsePositiveInt(
  input: string,
  fieldName: string,
): ParsedInput<number> {
  const value = Number(input.trim());

  if (!Number.isInteger(value) || value <= 0) {
    return {
      ok: false,
      error: `${fieldName} должно быть положительным целым числом. Попробуйте еще раз.`,
    };
  }

  return { ok: true, value };
}

export function parseNonNegativeInt(
  input: string,
  fieldName: string,
): ParsedInput<number> {
  const value = Number(input.trim());

  if (!Number.isInteger(value) || value < 0) {
    return {
      ok: false,
      error: `${fieldName} должно быть целым числом 0 или больше. Попробуйте еще раз.`,
    };
  }

  return { ok: true, value };
}

export function parseTelegramId(input: string): ParsedInput<string> {
  const value = input.trim();

  if (!/^\d+$/.test(value)) {
    return {
      ok: false,
      error: 'Telegram ID должен содержать только цифры. Отправьте ID еще раз.',
    };
  }

  return { ok: true, value };
}

export function parseDealerTagInput(input: string): ParsedInput<DealerTag> {
  const normalized = input.trim().toUpperCase();

  if (normalized !== DealerTag.STANDARD && normalized !== DealerTag.PREMIUM) {
    return {
      ok: false,
      error: 'Выберите тег кнопкой ниже: Standard или Premium.',
    };
  }

  return {
    ok: true,
    value: normalized as DealerTag,
  };
}

export function parseExpirationDate(input: string): ParsedInput<Date> {
  const value = input.trim();
  const formats = ['DD.MM.YYYY HH:mm', 'DD.MM.YYYY', 'YYYY-MM-DD HH:mm', 'YYYY-MM-DD'];

  for (const format of formats) {
    const parsed = dayjs(value, format, true);
    if (!parsed.isValid()) {
      continue;
    }

    const withTime =
      format === 'DD.MM.YYYY' || format === 'YYYY-MM-DD'
        ? parsed.hour(23).minute(59).second(0).millisecond(0)
        : parsed.second(0).millisecond(0);

    if (withTime.toDate() <= new Date()) {
      return {
        ok: false,
        error: 'Дата окончания должна быть в будущем. Укажите дату еще раз.',
      };
    }

    return { ok: true, value: withTime.toDate() };
  }

  return {
    ok: false,
    error:
      'Не удалось распознать дату. Используйте формат ДД.ММ.ГГГГ ЧЧ:ММ или YYYY-MM-DD HH:mm.',
  };
}
