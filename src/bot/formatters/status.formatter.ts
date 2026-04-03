import { Dealer, DealerTag, SubscriptionStatus } from '@prisma/client';
import dayjs from 'dayjs';
import { BOT_UI } from '../constants/bot-ui.constants';

export function formatDealerTagLabel(tag: DealerTag): string {
  return tag === DealerTag.PREMIUM ? 'premium' : 'standard';
}

export function formatDealerStatusLabel(dealer: Dealer): string {
  if (!dealer.isActive) {
    return '🚫 Отключен';
  }

  if (dealer.expiresAt < new Date()) {
    return '⏳ Истек';
  }

  if (dealer.createdCount >= dealer.keyLimit) {
    return '⚠️ Лимит исчерпан';
  }

  return '✅ Активен';
}

export function formatSubscriptionStatusLabel(subscription: {
  status: SubscriptionStatus;
  expiresAt: Date;
}) {
  if (subscription.status === SubscriptionStatus.DELETED) {
    return '❌ Удалена';
  }

  if (subscription.status === SubscriptionStatus.PAUSED) {
    return '⏸ На паузе';
  }

  if (subscription.expiresAt < new Date()) {
    return '⏳ Истекла';
  }

  return '✅ Активна';
}

export function getDealerWarning(dealer: Dealer): string | undefined {
  if (!dealer.isActive) {
    return 'Дилер отключен администратором.';
  }

  if (dealer.expiresAt < new Date()) {
    return 'Срок дилерского доступа истек.';
  }

  if (dealer.createdCount >= dealer.keyLimit) {
    return 'Лимит ключей исчерпан.';
  }

  const daysLeft = dayjs(dealer.expiresAt).diff(dayjs(), 'day', true);
  if (daysLeft <= BOT_UI.EXPIRING_SOON_DAYS) {
    return 'Срок доступа скоро истекает.';
  }

  return undefined;
}

export function getSubscriptionWarning(subscription: {
  status: SubscriptionStatus;
  expiresAt: Date;
}) {
  if (subscription.status === SubscriptionStatus.PAUSED) {
    return 'Подписка сейчас находится на паузе.';
  }

  if (subscription.status === SubscriptionStatus.DELETED) {
    return 'Подписка удалена.';
  }

  if (subscription.expiresAt < new Date()) {
    return 'Подписка истекла.';
  }

  const daysLeft = dayjs(subscription.expiresAt).diff(dayjs(), 'day', true);
  if (daysLeft <= BOT_UI.EXPIRING_SOON_DAYS) {
    return 'Подписка скоро истечет.';
  }

  return undefined;
}
