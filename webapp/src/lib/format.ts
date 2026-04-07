import { DealerTag, SubscriptionStatus } from './types';

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  return `${formatDate(value)} ${date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export function getDaysLeft(value: string) {
  const diff = new Date(value).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function resolveStatus(status: SubscriptionStatus, expiresAt: string): SubscriptionStatus {
  if (status === 'DELETED' || status === 'DISABLED') {
    return status;
  }

  return getDaysLeft(expiresAt) < 0 ? 'EXPIRED' : status;
}

export function formatDealerTag(tag: DealerTag) {
  return tag === 'PREMIUM' ? 'premium' : 'standard';
}
