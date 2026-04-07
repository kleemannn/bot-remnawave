import { ReactNode } from 'react';
import { Card } from './Card';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card className="space-y-3 py-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-tg-muted text-2xl">
        ○
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-tg-text">{title}</h3>
        <p className="text-sm leading-6 text-tg-hint">{description}</p>
      </div>
      {action}
    </Card>
  );
}
