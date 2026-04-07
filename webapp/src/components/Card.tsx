import { PropsWithChildren } from 'react';

interface CardProps {
  className?: string;
}

export function Card({ children, className = '' }: PropsWithChildren<CardProps>) {
  return (
    <section
      className={[
        'rounded-[28px] border border-tg-border bg-tg-card px-4 py-4 shadow-soft',
        className,
      ].join(' ')}
    >
      {children}
    </section>
  );
}
