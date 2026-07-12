import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, id, className, ...rest }, ref) => {
  const generatedId = useId();
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : generatedId);
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-label={label || rest.placeholder}
        ref={ref}
        className={clsx(
          'input-recessed w-full rounded-xl px-4 py-3 font-sans text-sm text-ink placeholder:text-ink-400',
          error && 'ring-2 ring-red-400',
          className,
        )}
        {...rest}
      />
      {error && <span className="font-mono text-xs text-red-500">{error}</span>}
    </div>
  );
});
Input.displayName = 'Input';
