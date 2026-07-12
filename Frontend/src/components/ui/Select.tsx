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
          <label htmlFor={selectId} className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-label">
            {label}
          </label>
        )}
        <select
          id={selectId}
          aria-label={label || placeholder}
          ref={ref}
          className={clsx(
            'select-recessed w-full rounded-xl px-4 py-3 font-sans text-sm text-ink',
            error && 'ring-2 ring-red-400',
            className,
          )}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <span className="font-mono text-xs text-red-500">{error}</span>}
      </div>
    );
  },
);
Select.displayName = 'Select';
