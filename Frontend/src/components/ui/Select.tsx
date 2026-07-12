import { forwardRef } from 'react';
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
    const selectId = id ?? label.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={selectId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
        <select
          id={selectId}
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
