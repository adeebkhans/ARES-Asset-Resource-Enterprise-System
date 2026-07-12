import { forwardRef, useId } from 'react';
import type { SelectHTMLAttributes } from 'react';
import clsx from 'clsx';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, id, className, ...rest }, ref) => {
    const generatedId = useId();
    const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : generatedId);
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-ink-700 dark:text-ink-300">
            {label}
          </label>
        )}
        <select
          id={selectId}
          aria-label={label || placeholder}
          ref={ref}
          className={clsx(
            'rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
            'bg-white text-ink-900 dark:bg-ink-900 dark:text-ink-100',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30'
              : 'border-ink-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:focus:border-brand-500 dark:focus:ring-brand-900/30',
            className,
          )}
          {...rest}
        >
          {placeholder && (
            <option value="">{placeholder}</option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
      </div>
    );
  },
);
Select.displayName = 'Select';
