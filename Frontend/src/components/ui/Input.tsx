import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, id, className, ...rest }, ref) => {
  const generatedId = useId();
  // A blank label (e.g. a toolbar search box) means no visible <label> — fall
  // back to a stable generated id instead of deriving one from empty text,
  // which produced duplicate id="" attributes when multiple such inputs shared a page.
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : generatedId);
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink-700 dark:text-ink-300">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-label={label || rest.placeholder}
        ref={ref}
        className={clsx(
          'rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
          'bg-white text-ink-900 placeholder:text-ink-400 dark:bg-ink-900 dark:text-ink-100 dark:placeholder:text-ink-500',
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30'
            : 'border-ink-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:focus:border-brand-500 dark:focus:ring-brand-900/30',
          className,
        )}
        {...rest}
      />
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
});
Input.displayName = 'Input';
