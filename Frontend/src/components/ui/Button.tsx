import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  isLoading?: boolean;
}

export function Button({ variant = 'primary', isLoading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' && 'btn-physical bg-chassis text-ink',
        variant === 'secondary' && 'btn-physical bg-chassis text-label',
        variant === 'ghost' && 'text-label hover:bg-recessed hover:text-ink rounded-lg px-3 py-1.5',
        variant === 'danger' && 'btn-accent bg-accent text-accent-fg',
        className,
      )}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading ? (
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Processing
        </span>
      ) : (
        children
      )}
    </button>
  );
}
