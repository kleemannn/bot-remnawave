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
