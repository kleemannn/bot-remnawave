'use client';

import { useRouter } from 'next/navigation';

interface HeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
}

export function Header({ title, subtitle, backHref }: HeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-20 -mx-4 mb-4 bg-[color:var(--tg-bg)]/92 px-4 pb-3 pt-2 backdrop-blur">
      <div className="flex items-center gap-3">
        {backHref ? (
          <button
            type="button"
            aria-label="Назад"
            onClick={() => router.push(backHref)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-tg-card text-xl text-tg-text"
          >
            ←
          </button>
        ) : null}
        <div className="min-w-0">
          <h1 className="truncate text-[28px] font-semibold text-tg-text">{title}</h1>
          {subtitle ? <p className="text-sm text-tg-hint">{subtitle}</p> : null}
        </div>
      </div>
    </header>
  );
}
