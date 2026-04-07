'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/Skeleton';
import { getProfile } from '@/lib/api';
import { formatDate, formatDealerTag } from '@/lib/format';
import { DealerProfile } from '@/lib/types';
import { useUserStore } from '@/store/useUserStore';

export default function ProfilePage() {
  const cachedProfile = useUserStore((state) => state.profile);
  const setProfile = useUserStore((state) => state.setProfile);
  const [profile, setProfileState] = useState<DealerProfile | null>(cachedProfile);
  const [loading, setLoading] = useState(!cachedProfile);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getProfile()
      .then((response) => {
        if (!active) {
          return;
        }

        setProfileState(response);
        setProfile(response);
        setError(null);
      })
      .catch((err) => {
        if (!active) {
          return;
        }

        setError(err instanceof Error ? err.message : 'Не удалось загрузить профиль.');
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

  return (
    <Screen>
      <Header title="Профиль" subtitle="Параметры дилера" backHref="/dashboard" />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full rounded-[28px]" />
          <Skeleton className="h-24 w-full rounded-[28px]" />
        </div>
      ) : error ? (
        <Card className="space-y-3">
          <p className="text-base font-semibold text-tg-text">Профиль недоступен</p>
          <p className="text-sm text-tg-hint">{error}</p>
        </Card>
      ) : profile ? (
        <>
          <Card className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-tg-hint">Тег дилера</p>
                <h2 className="text-2xl font-semibold text-tg-text">
                  {formatDealerTag(profile.tag)}
                </h2>
              </div>
              <span
                className={[
                  'rounded-full px-3 py-1.5 text-xs font-semibold',
                  profile.isActive
                    ? 'bg-emerald-500/14 text-emerald-600 dark:text-emerald-300'
                    : 'bg-rose-500/14 text-rose-600 dark:text-rose-300',
                ].join(' ')}
              >
                {profile.isActive ? 'Активен' : 'Отключен'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric label="Лимит" value={String(profile.keyLimit)} />
              <Metric label="Создано" value={String(profile.createdCount)} />
              <Metric label="Осталось" value={String(profile.remainingCount)} />
              <Metric label="До конца" value={`${profile.daysUntilExpiry} дн`} />
            </div>
          </Card>

          <Card className="mt-4 space-y-3">
            <InfoRow label="Доступ до" value={formatDate(profile.expiresAt)} />
            <InfoRow label="Telegram ID" value={profile.telegramId} />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-tg-muted p-3">
      <p className="text-xs text-tg-hint">{label}</p>
      <p className="mt-1 text-xl font-semibold text-tg-text">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-tg-hint">{label}</span>
      <span className="text-sm font-semibold text-tg-text">{value}</span>
    </div>
  );
}
