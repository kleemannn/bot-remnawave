'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/Skeleton';
import { StatusBadge } from '@/components/Badge';
import {
  deleteSubscription,
  getSubscription,
  pauseSubscription,
  resumeSubscription,
} from '@/lib/api';
import { formatDateTime, resolveStatus } from '@/lib/format';
import { SubscriptionDetail, SubscriptionStatus } from '@/lib/types';
import { useUiStore } from '@/store/useUiStore';

type ActionType = 'pause' | 'resume' | 'delete' | null;

export default function SubscriptionDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const showToast = useUiStore((state) => state.showToast);
  const [subscription, setSubscription] = useState<SubscriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<ActionType>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getSubscription(params.id)
      .then((response) => {
        if (!active) {
          return;
        }

        setSubscription(response);
        setError(null);
      })
      .catch((err) => {
        if (!active) {
          return;
        }

        setError(err instanceof Error ? err.message : 'Не удалось загрузить подписку.');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [params.id]);

  const resolvedStatus = useMemo(
    () =>
      subscription ? resolveStatus(subscription.status, subscription.expiresAt) : 'ACTIVE',
    [subscription],
  );

  const handleAction = async () => {
    if (!subscription || !action) {
      return;
    }

    setActionLoading(true);
    try {
      if (action === 'pause') {
        await pauseSubscription(subscription.id);
        setSubscription((current) =>
          current ? { ...current, status: 'PAUSED' } : current,
        );
        showToast('Подписка поставлена на паузу');
      }

      if (action === 'resume') {
        await resumeSubscription(subscription.id);
        setSubscription((current) =>
          current ? { ...current, status: 'ACTIVE' } : current,
        );
        showToast('Подписка возобновлена');
      }

      if (action === 'delete') {
        await deleteSubscription(subscription.id);
        showToast('Подписка удалена');
        router.push('/subscriptions');
        return;
      }

      setAction(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Действие не выполнено.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Screen>
      <Header title="Подписка" subtitle="Карточка пользователя" backHref="/subscriptions" />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-60 w-full rounded-[28px]" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : error ? (
        <Card className="space-y-3">
          <p className="text-base font-semibold text-tg-text">Не удалось открыть подписку</p>
          <p className="text-sm text-tg-hint">{error}</p>
        </Card>
      ) : subscription ? (
        <>
          <Card className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-tg-hint">Пользователь</p>
                <h2 className="text-2xl font-semibold text-tg-text">{subscription.username}</h2>
              </div>
              <StatusBadge status={resolvedStatus} />
            </div>

            <div className="space-y-3 rounded-3xl bg-tg-cardStrong/80 p-4">
              <DetailRow label="Действует до" value={formatDateTime(subscription.expiresAt)} />
              <DetailRow label="Осталось дней" value={String(subscription.daysLeft)} />
              <DetailRow label="Тег дилера" value={subscription.dealerTag.toLowerCase()} />
              <DetailRow label="Создал" value={subscription.createdBy} />
            </div>
          </Card>

          <div className="mt-4 space-y-3">
            {resolvedStatus === 'ACTIVE' ? (
              <Button variant="secondary" onClick={() => setAction('pause')}>
                Пауза
              </Button>
            ) : null}

            {(resolvedStatus === 'PAUSED' || resolvedStatus === 'DISABLED') ? (
              <Button onClick={() => setAction('resume')}>Возобновить</Button>
            ) : null}

            <Button variant="danger" onClick={() => setAction('delete')}>
              Удалить
            </Button>
          </div>
        </>
      ) : null}

      <ConfirmSheet
        open={Boolean(action)}
        title={
          action === 'pause'
            ? 'Поставить на паузу?'
            : action === 'resume'
              ? 'Возобновить подписку?'
              : 'Удалить подписку?'
        }
        description={
          action === 'delete'
            ? 'После удаления ключ исчезнет из панели.'
            : 'Действие можно выполнить прямо сейчас.'
        }
        confirmLabel={action === 'delete' ? 'Удалить' : 'Подтвердить'}
        danger={action === 'delete'}
        onClose={() => setAction(null)}
        onConfirm={handleAction}
        loading={actionLoading}
      >
        {subscription ? (
          <div className="rounded-2xl bg-tg-muted p-3 text-sm text-tg-hint">
            <p className="font-medium text-tg-text">{subscription.username}</p>
            <p>Статус: {statusLabel(resolvedStatus)}</p>
            <p>До: {formatDateTime(subscription.expiresAt)}</p>
          </div>
        ) : null}
      </ConfirmSheet>
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-tg-hint">{label}</span>
      <span className="text-sm font-semibold text-tg-text">{value}</span>
    </div>
  );
}

function statusLabel(status: SubscriptionStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'Активна';
    case 'PAUSED':
      return 'На паузе';
    case 'EXPIRED':
      return 'Истекла';
    case 'DELETED':
      return 'Удалена';
    case 'DISABLED':
      return 'Отключена';
  }
}
