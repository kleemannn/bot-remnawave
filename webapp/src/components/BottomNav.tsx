'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/dashboard', label: 'Главная', icon: '⌂' },
  { href: '/subscriptions', label: 'Подписки', icon: '◫' },
  { href: '/profile', label: 'Профиль', icon: '◌' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t border-tg-border bg-[color:var(--tg-card)]/96 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur">
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex min-h-12 flex-col items-center justify-center rounded-2xl text-xs font-medium',
                active ? 'bg-tg-primary text-tg-primaryText' : 'bg-tg-muted text-tg-hint',
              ].join(' ')}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
