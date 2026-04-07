'use client';

import { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-tg-primary text-tg-primaryText active:scale-[0.99]',
  secondary: 'bg-tg-card text-tg-text border border-tg-border active:scale-[0.99]',
  danger: 'bg-tg-danger text-white active:scale-[0.99]',
  ghost: 'bg-transparent text-tg-hint',
};

export function buttonClasses(variant: ButtonVariant = 'primary', className = '') {
  return [
    'flex min-h-12 w-full items-center justify-center rounded-2xl px-4 py-3 text-[15px] font-semibold transition-transform duration-150 disabled:cursor-not-allowed disabled:opacity-60',
    variantClasses[variant],
    className,
  ].join(' ');
}

export function Button({
  children,
  className = '',
  variant = 'primary',
  loading = false,
  disabled,
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={buttonClasses(variant, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Подождите...' : children}
    </button>
  );
}
