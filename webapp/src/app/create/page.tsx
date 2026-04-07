'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, buttonClasses } from '@/components/Button';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { createSubscription } from '@/lib/api';
import { formatDate, resolveStatus } from '@/lib/format';
import { SubscriptionStatus } from '@/lib/types';
import { useUiStore } from '@/store/useUiStore';

const quickDays = [7, 30, 90];

type Step = 1 | 2 | 3 | 4;

export default function CreateSubscriptionPage() {
  const router = useRouter();
  const showToast = useUiStore((state) => state.showToast);
  const [step, setStep] = useState<Step>(1);
  const [username, setUsername] = useState('');
  const [days, setDays] = useState(30);
  const [customDays, setCustomDays] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    id: string;
    username: string;
    expiresAt: string;
    status: SubscriptionStatus;
    link?: string | null;
  } | null>(null);

  const resolvedDays = useMemo(() => {
    if (!customDays) {
      return days;
    }

    return Number(customDays);
  }, [customDays, days]);

  const onNextFromUsername = () => {
    const value = username.trim().replace(/\s+/g, '');
    if (!value) {
      setError('Введите username без пробелов.');
      return;
    }

    setUsername(value);
    setError(null);
    setStep(2);
  };

  const onNextFromDays = () => {
    if (!Number.isInteger(resolvedDays) || resolvedDays <= 0) {
      setError('Укажите срок в днях.');
      return;
    }

    setError(null);
    setStep(3);
  };

  const onCreate = async () => {
    setLoading(true);
    try {
      const response = await createSubscription({
        username,
        days: resolvedDays,
      });

      setResult({
        id: response.subscription.id,
        username: response.subscription.username,
        expiresAt: response.subscription.expiresAt,
        status: response.subscription.status,
        link: response.happEncryptedUrl ?? response.subscriptionUrl ?? null,
      });
      setStep(4);
      showToast('Подписка создана');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать подписку.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Header title="Создание" subtitle={`Шаг ${Math.min(step, 3)} из 3`} backHref="/dashboard" />

      {step === 1 ? (
        <Card className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-tg-text">Введите username</h2>
            <p className="text-sm text-tg-hint">Без пробелов и лишних символов.</p>
          </div>
          <Input
            autoFocus
            placeholder="например, ali123"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            error={error}
          />
          <Button onClick={onNextFromUsername}>Далее</Button>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-tg-text">Выберите срок</h2>
            <p className="text-sm text-tg-hint">Можно быстро выбрать популярный вариант.</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {quickDays.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setDays(value);
                  setCustomDays('');
                }}
                className={[
                  'min-h-12 rounded-2xl text-sm font-semibold',
                  !customDays && days === value
                    ? 'bg-tg-primary text-tg-primaryText'
                    : 'bg-tg-muted text-tg-text',
                ].join(' ')}
              >
                {value} дн
              </button>
            ))}
          </div>

          <Input
            label="Или свой срок"
            inputMode="numeric"
            placeholder="Введите количество дней"
            value={customDays}
            onChange={(event) => setCustomDays(event.target.value.replace(/[^\d]/g, ''))}
            error={error}
          />

          <div className="space-y-3">
            <Button onClick={onNextFromDays}>Далее</Button>
            <Button variant="secondary" onClick={() => setStep(1)}>
              Назад
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-tg-text">Подтвердите создание</h2>
            <p className="text-sm text-tg-hint">Проверьте данные перед отправкой.</p>
          </div>

          <div className="space-y-3 rounded-3xl bg-tg-muted p-4">
            <Row label="Username" value={username} />
            <Row label="Срок" value={`${resolvedDays} дней`} />
          </div>

          {error ? <p className="text-sm text-tg-danger">{error}</p> : null}

          <div className="space-y-3">
            <Button onClick={onCreate} loading={loading}>
              Создать подписку
            </Button>
            <Button variant="secondary" onClick={() => setStep(2)} disabled={loading}>
              Назад
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 4 && result ? (
        <Card className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-tg-text">Подписка создана</h2>
            <p className="text-sm text-tg-hint">Все готово. Можно открыть карточку или создать еще одну.</p>
          </div>

          <div className="space-y-3 rounded-3xl bg-tg-muted p-4">
            <Row label="Пользователь" value={result.username} />
            <Row
              label="Статус"
              value={statusLabel(resolveStatus(result.status, result.expiresAt))}
            />
            <Row label="Действует до" value={formatDate(result.expiresAt)} />
          </div>

          {result.link ? (
            <Button
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(result.link ?? '');
                showToast('Ключ скопирован');
              }}
            >
              Скопировать ключ
            </Button>
          ) : null}

          <div className="space-y-3">
            <Button onClick={() => router.push('/subscriptions')}>📋 Мои подписки</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setStep(1);
                setUsername('');
                setDays(30);
                setCustomDays('');
                setResult(null);
                setError(null);
              }}
            >
              ➕ Создать еще
            </Button>
            <Link href="/dashboard" className={buttonClasses('ghost')}>
              В меню
            </Link>
          </div>
        </Card>
      ) : null}
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
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
