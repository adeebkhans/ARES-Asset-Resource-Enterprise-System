import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = 'ph-tray', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-chassis p-16 text-center" style={{ boxShadow: 'inset 4px 4px 8px #babecc, inset -4px -4px 8px #ffffff' }}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-chassis" style={{ boxShadow: 'inset 4px 4px 8px #babecc, inset -4px -4px 8px #ffffff' }}>
        <i className={`ph ${icon}`} style={{ fontSize: 28, color: '#4a5568' }} />
      </div>
      <h3 className="font-mono text-sm font-bold uppercase tracking-widest text-ink">{title}</h3>
      {description && <p className="max-w-sm text-sm text-label">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
