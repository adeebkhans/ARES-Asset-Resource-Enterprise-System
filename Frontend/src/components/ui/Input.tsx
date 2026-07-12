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
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-label={label || rest.placeholder}
        ref={ref}
        className={clsx(
          'rounded-md border px-3 py-2 text-sm outline-none transition-colors',
          'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100',
          error
            ? 'border-red-500 focus:border-red-500'
            : 'border-slate-300 focus:border-slate-500 dark:border-slate-700 dark:focus:border-slate-400',
          className,
        )}
        {...rest}
      />
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
});
Input.displayName = 'Input';
