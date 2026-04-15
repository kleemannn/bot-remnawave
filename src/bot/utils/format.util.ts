import { Dealer, DealerTag, SubscriptionStatus } from '@prisma/client';
import dayjs from 'dayjs';

export function formatDate(date: Date): string {
  return dayjs(date).format('DD.MM.YYYY HH:mm');
}

export function formatDealerTag(tag: DealerTag): string {
  return tag === DealerTag.PREMIUM ? 'Premium' : 'Standard';
}

export function formatSubscriptionStatus(status: SubscriptionStatus): string {
  switch (status) {
    case SubscriptionStatus.ACTIVE:
      return 'Активна';
    case SubscriptionStatus.PAUSED:
      return 'На паузе';
    case SubscriptionStatus.DELETED:
      return 'Удалена';
    default:
      return status;
  }
}

export function formatDealerStatus(dealer: Dealer): string {
  if (!dealer.isActive) {
    return 'Отключен';
  }

  if (dealer.expiresAt < new Date()) {
    return 'Срок доступа истек';
  }

  if (dealer.createdCount >= dealer.keyLimit) {
    return 'Лимит исчерпан';
  }

  return 'Активен';
}

export function formatDaysLeft(expiresAt: Date): string {
  const now = dayjs();
  const end = dayjs(expiresAt);
  const diffInHours = end.diff(now, 'hour', true);

  if (diffInHours <= 0) {
    return '0';
  }

  return String(Math.ceil(diffInHours / 24));
}

export function formatDaysFromSeconds(seconds?: number | null): string {
  if (!seconds || seconds <= 0) {
    return '0';
  }

  return String(Math.ceil(seconds / 86400));
}

export function formatRemainingKeys(dealer: Dealer): string {
  return String(Math.max(dealer.keyLimit - dealer.createdCount, 0));
}

export function formatUsername(value?: string | null): string {
  if (!value) {
    return 'Не указан';
  }

  return value.startsWith('@') ? value : `@${value}`;
}

export function formatTraffic(bytes?: number | null): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) {
    return 'Неизвестно';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

export function formatOnlineNow(value?: boolean): string {
  if (value === true) {
    return 'Да';
  }

  if (value === false) {
    return 'Нет';
  }

  return 'Неизвестно';
}
