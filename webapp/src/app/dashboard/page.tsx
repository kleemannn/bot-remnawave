'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { buttonClasses } from '@/components/Button';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/Skeleton';
import { getDashboard } from '@/lib/api';
import { formatDate, formatDealerTag } from '@/lib/format';
import { DashboardPayload } from '@/lib/types';
import { useUserStore } from '@/store/useUserStore';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = useUserStore((state) => state.user);
  const setProfile = useUserStore((state) => state.setProfile);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getDashboard()
      .then((response) => {
        if (!active) {
          return;
        }

        setData(response);
        setProfile(response.profile);
        setError(null);
      })
      .catch((err) => {
        if (!active) {
          return;
        }

        setError(err instanceof Error ? err.message : 'Не удалось загрузить панель.');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [setProfile]);

  const greetingName =
    data?.user.first_name ?? user?.first_name ?? user?.username ?? 'дилер';

  return (
    <Screen>
      <Header title="Панель" subtitle={`Здравствуйте, ${greetingName}`} />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-[28px]" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      ) : error ? (
        <Card className="space-y-3">
          <p className="text-base font-semibold text-tg-text">Не удалось загрузить данные</p>
          <p className="text-sm leading-6 text-tg-hint">{error}</p>
        </Card>
      ) : data ? (
        <>
          <Card className="space-y-4 overflow-hidden bg-gradient-to-br from-tg-cardStrong via-tg-card to-tg-muted">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm text-tg-hint">Статус дилера</p>
                <h2 className="text-2xl font-semibold text-tg-text">
                  {data.profile.isActive ? 'Активен' : 'Отключен'}
                </h2>
              </div>
              <span className="rounded-full bg-tg-primary px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-tg-primaryText">
                {formatDealerTag(data.profile.tag)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-tg-cardStrong/80 p-3">
                <p className="text-tg-hint">Действует до</p>
                <p className="mt-1 font-semibold text-tg-text">{formatDate(data.profile.expiresAt)}</p>
              </div>
              <div className="rounded-2xl bg-tg-cardStrong/80 p-3">
                <p className="text-tg-hint">Осталось ключей</p>
                <p className="mt-1 font-semibold text-tg-text">{data.profile.remainingCount}</p>
              </div>
            </div>

            {data.stats.expiresInDays <= 7 ? (
              <div className="rounded-2xl bg-amber-500/14 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                Доступ заканчивается через {data.stats.expiresInDays} дн.
              </div>
            ) : null}
          </Card>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <Card className="space-y-1 p-3">
              <p className="text-xs text-tg-hint">Активные</p>
              <p className="text-xl font-semibold text-tg-text">{data.stats.activeSubscriptions}</p>
            </Card>
            <Card className="space-y-1 p-3">
              <p className="text-xs text-tg-hint">Лимит</p>
              <p className="text-xl font-semibold text-tg-text">{data.stats.remainingLimit}</p>
            </Card>
            <Card className="space-y-1 p-3">
              <p className="text-xs text-tg-hint">До конца</p>
              <p className="text-xl font-semibold text-tg-text">{data.stats.expiresInDays}</p>
            </Card>
          </div>
        </>
      ) : null}

      <div className="mt-5 space-y-3">
        <Link href="/create" className={buttonClasses('primary')}>
          ➕ Создать подписку
        </Link>
        <Link href="/subscriptions" className={buttonClasses('secondary')}>
          📋 Мои подписки
        </Link>
        <Link href="/profile" className={buttonClasses('secondary')}>
          👤 Профиль
        </Link>
      </div>
    </Screen>
  );
}
