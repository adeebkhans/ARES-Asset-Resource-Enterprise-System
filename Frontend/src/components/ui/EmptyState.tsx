import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Consistent empty-state treatment — every list page hits this at least once (a fresh org has nothing in it). */
export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-300 bg-ink-50/50 px-6 py-16 text-center dark:border-ink-700 dark:bg-ink-900/40">
      <span className="text-4xl">{icon}</span>
      <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-white">{title}</h3>
      {description && <p className="max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
