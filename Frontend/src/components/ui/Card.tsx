import type { HTMLAttributes } from 'react';
import clsx from 'clsx';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-ink-200/70 bg-white p-6 shadow-sm shadow-ink-900/3 dark:border-ink-800 dark:bg-ink-900',
        className,
      )}
      {...rest}
    />
  );
}
