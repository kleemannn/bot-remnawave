import { SubscriptionStatus } from '@/lib/types';

const badgeMap: Record<
  SubscriptionStatus,
  { label: string; className: string }
> = {
  ACTIVE: {
    label: 'Активна',
    className: 'bg-emerald-500/14 text-emerald-600 dark:text-emerald-300',
  },
  PAUSED: {
    label: 'На паузе',
    className: 'bg-amber-500/16 text-amber-600 dark:text-amber-300',
  },
  EXPIRED: {
    label: 'Истекла',
    className: 'bg-rose-500/14 text-rose-600 dark:text-rose-300',
  },
  DELETED: {
    label: 'Удалена',
    className: 'bg-rose-500/14 text-rose-600 dark:text-rose-300',
  },
  DISABLED: {
    label: 'Отключена',
    className: 'bg-slate-500/16 text-slate-600 dark:text-slate-300',
  },
};

export function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const config = badgeMap[status];

  return (
    <span
      className={[
        'inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold',
        config.className,
      ].join(' ')}
    >
      {config.label}
    </span>
  );
}
