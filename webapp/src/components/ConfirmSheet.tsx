'use client';

import { ReactNode } from 'react';
import { Button } from './Button';

interface ConfirmSheetProps {
  open: boolean;
  title: string;
  description: string;
  danger?: boolean;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
  children?: ReactNode;
}

export function ConfirmSheet({
  open,
  title,
  description,
  danger = false,
  confirmLabel = 'Подтвердить',
  onConfirm,
  onClose,
  loading = false,
  children,
}: ConfirmSheetProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-slate-950/30">
      <div className="w-full rounded-t-[32px] bg-tg-card px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4 shadow-card">
        <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-tg-border" />
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-tg-text">{title}</h3>
          <p className="text-sm leading-6 text-tg-hint">{description}</p>
          {children}
        </div>
        <div className="mt-5 space-y-3">
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
        </div>
      </div>
    </div>
  );
}
