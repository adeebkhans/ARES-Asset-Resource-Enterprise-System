import clsx from 'clsx';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

const BADGE_STYLES: Record<BadgeVariant, string> = {
  default: 'bg-recessed text-label shadow-[inset_2px_2px_4px_#babecc,inset_-2px_-2px_4px_#ffffff]',
  success: 'bg-emerald-100 text-emerald-700 shadow-[inset_2px_2px_4px_rgba(34,197,94,0.15),inset_-2px_-2px_4px_rgba(255,255,255,0.5)]',
  warning: 'bg-amber-100 text-amber-700 shadow-[inset_2px_2px_4px_rgba(255,165,2,0.15),inset_-2px_-2px_4px_rgba(255,255,255,0.5)]',
  danger: 'bg-red-100 text-red-700 shadow-[inset_2px_2px_4px_rgba(255,71,87,0.15),inset_-2px_-2px_4px_rgba(255,255,255,0.5)]',
  info: 'bg-sky-100 text-sky-700 shadow-[inset_2px_2px_4px_rgba(30,144,255,0.15),inset_-2px_-2px_4px_rgba(255,255,255,0.5)]',
  brand: 'bg-red-100 text-red-700 shadow-[inset_2px_2px_4px_rgba(255,71,87,0.15),inset_-2px_-2px_4px_rgba(255,255,255,0.5)]',
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
        'inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest',
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
  PLANNED: 'info',
  ALLOCATED: 'info',
  RESERVED: 'info',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  ESCALATED: 'warning',
  IN_PROGRESS: 'info',
  UNDER_MAINTENANCE: 'warning',
  LOST: 'danger',
  MISSING: 'danger',
  DAMAGED: 'warning',
  VERIFIED: 'success',
  RETIRED: 'default',
  DISPOSED: 'default',
  CLOSED: 'default',
  INACTIVE: 'danger',
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_BADGE[status] ?? 'default'}>{status.replace(/_/g, ' ')}</Badge>;
}
