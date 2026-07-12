import clsx from 'clsx';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const BADGE_STYLES: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        BADGE_STYLES[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_BADGE: Record<string, BadgeVariant> = {
  AVAILABLE: 'success',
  ACTIVE: 'success',
  ALLOCATED: 'info',
  RESERVED: 'info',
  UNDER_MAINTENANCE: 'warning',
  LOST: 'danger',
  RETIRED: 'default',
  DISPOSED: 'default',
  INACTIVE: 'danger',
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_BADGE[status] ?? 'default'}>{status.replace(/_/g, ' ')}</Badge>;
}
