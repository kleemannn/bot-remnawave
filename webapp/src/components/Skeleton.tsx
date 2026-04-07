export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={['animate-pulse rounded-2xl bg-tg-muted', className].join(' ')} />;
}
