'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, buttonClasses } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/Skeleton';
import { StatusBadge } from '@/components/Badge';
import { getSubscriptions } from '@/lib/api';
import { formatDate, resolveStatus } from '@/lib/format';
import { PaginatedResponse, SubscriptionListItem } from '@/lib/types';

export default function SubscriptionsPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedResponse<SubscriptionListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getSubscriptions(page)
      .then((response) => {
        if (!active) {
          return;
        }

        setData(response);
        setError(null);
      })
      .catch((err) => {
        if (!active) {
          return;
        }

        setError(err instanceof Error ? err.message : 'Не удалось загрузить подписки.');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [page]);

  return (
    <Screen>
      <Header title="Подписки" subtitle="Все ключи под рукой" backHref="/dashboard" />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-[28px]" />
          ))}
        </div>
      ) : error ? (
        <Card className="space-y-3">
          <p className="text-base font-semibold text-tg-text">Не удалось загрузить список</p>
          <p className="text-sm text-tg-hint">{error}</p>
        </Card>
      ) : data?.items.length ? (
        <div className="space-y-3">
          {data.items.map((subscription) => (
            <Link key={subscription.id} href={`/subscription/${subscription.id}`}>
              <Card className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-tg-text">
                      {subscription.username}
                    </p>
                    <p className="text-sm text-tg-hint">До {formatDate(subscription.expiresAt)}</p>
                  </div>
                  <StatusBadge
                    status={resolveStatus(subscription.status, subscription.expiresAt)}
                  />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Нет подписок"
          description="Создайте первую подписку, и она появится здесь."
          action={
            <Link href="/create" className={buttonClasses('primary')}>
              ➕ Создать
            </Link>
          }
        />
      )}

      {data && data.pageCount > 1 ? (
        <div className="mt-4 flex gap-3">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
            ← Назад
          </Button>
          <Button
            variant="secondary"
            disabled={page >= data.pageCount}
            onClick={() => setPage((value) => value + 1)}
          >
            Далее →
          </Button>
        </div>
      ) : null}
    </Screen>
  );
}
