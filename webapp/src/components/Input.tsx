import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className = '', ...props },
  ref,
) {
  return (
    <label className="block space-y-2">
      {label ? <span className="text-sm font-medium text-tg-hint">{label}</span> : null}
      <input
        ref={ref}
        className={[
          'min-h-12 w-full rounded-2xl border border-tg-border bg-tg-cardStrong px-4 text-base text-tg-text outline-none transition focus:border-tg-primary',
          className,
        ].join(' ')}
        {...props}
      />
      {error ? <span className="text-sm text-tg-danger">{error}</span> : null}
    </label>
  );
});
