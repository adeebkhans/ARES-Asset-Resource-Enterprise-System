import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { fetchMe } from '@/features/auth/api';
import { getDashboardKpis } from '@/features/reports/api';

const GREETING_HOUR = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  ASSET_MANAGER: 'Asset Manager',
  DEPARTMENT_HEAD: 'Department Head',
  EMPLOYEE: 'Employee',
};

interface KpiTileProps {
  label: string;
  value: number;
  phosphor: string;
  to: string;
}

function KpiTile({ label, value, phosphor, to }: KpiTileProps) {
  return (
    <Link to={to}>
      <Card className="relative overflow-hidden transition-all">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-chassis" style={{ boxShadow: 'inset 3px 3px 6px #babecc, inset -3px -3px 6px #ffffff' }}>
          <i className={`ph-bold ${phosphor}`} style={{ fontSize: 18, color: '#4a5568' }} />
        </div>
        <span className="block font-mono text-3xl font-bold text-ink">{value}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-label">{label}</span>
      </Card>
    </Link>
  );
}

const QUICK_ACTIONS_BY_ROLE: Record<string, { to: string; label: string; phosphor: string; hint: string }[]> = {
  ADMIN: [
    { to: '/assets', label: 'Register Asset', phosphor: 'package', hint: 'Add a new item to the directory' },
    { to: '/maintenance', label: 'Raise Maintenance', phosphor: 'wrench', hint: 'Report an issue with an asset' },
    { to: '/org-setup', label: 'Org Setup', phosphor: 'buildings', hint: 'Configure departments, categories & employees' },
    { to: '/custom-objects', label: 'Model Entity', phosphor: 'puzzle-piece', hint: 'Not everything is an Asset' },
  ],
  ASSET_MANAGER: [
    { to: '/assets', label: 'Register Asset', phosphor: 'package', hint: 'Add a new item to the directory' },
    { to: '/maintenance', label: 'Raise Maintenance', phosphor: 'wrench', hint: 'Report an issue with an asset' },
    { to: '/approvals', label: 'Review Approvals', phosphor: 'check-circle', hint: 'Approve or reject pending requests' },
  ],
  DEPARTMENT_HEAD: [
    { to: '/assets', label: 'Dept Assets', phosphor: 'package', hint: 'See assets under your department' },
    { to: '/maintenance', label: 'Raise Maintenance', phosphor: 'wrench', hint: 'Report an issue with an asset' },
    { to: '/approvals', label: 'Review Approvals', phosphor: 'check-circle', hint: 'Approve or reject pending requests' },
  ],
  EMPLOYEE: [
    { to: '/assets', label: 'Browse Assets', phosphor: 'package', hint: 'View available assets' },
    { to: '/maintenance', label: 'Raise Maintenance', phosphor: 'wrench', hint: 'Report an issue with an asset' },
  ],
};

function ActivityItem({ activity }: { activity: { action: string; entityType: string; timestamp: string; user?: { name: string } | null } }) {
  const timeAgo = getTimeAgo(activity.timestamp);
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-chassis" style={{ boxShadow: 'inset 2px 2px 4px #babecc, inset -2px -2px 4px #ffffff' }}>
        <i className="ph-bold ph-clock" style={{ fontSize: 12, color: '#4a5568' }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink">
          <span className="font-bold">{activity.user?.name ?? 'System'}</span> {activity.action} a {activity.entityType.toLowerCase().replace(/_/g, ' ')}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-label">{timeAgo}</p>
      </div>
    </div>
  );
}

function getTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function DashboardPage() {
  const { data: me } = useQuery({ queryKey: ['auth', 'me'], queryFn: fetchMe });
  const { data: kpis, isLoading } = useQuery({ queryKey: ['dashboard-kpis'], queryFn: getDashboardKpis });

  const role = me?.role ?? 'EMPLOYEE';
  const quickActions = QUICK_ACTIONS_BY_ROLE[role] ?? QUICK_ACTIONS_BY_ROLE.EMPLOYEE;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink border-t-transparent" />
          <span className="font-mono text-xs uppercase tracking-widest text-label">Loading System</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="mb-1 inline-flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ boxShadow: 'inset 3px 3px 6px #babecc, inset -3px -3px 6px #ffffff' }}>
          <i className="ph-fill ph-warning" style={{ fontSize: 12, color: '#ff4757' }} />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-accent">Protocol Active</span>
        </div>
        <h1 className="font-mono text-3xl font-extrabold uppercase tracking-tight text-ink">
          {GREETING_HOUR()}, {me?.name?.split(' ')[0] ?? ''}
        </h1>
        {me && (
          <p className="font-mono text-xs uppercase tracking-widest text-label">
            {ROLE_LABEL[me.role] ?? me.role} — {me.email}
          </p>
        )}
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {role === 'ADMIN' && (
          <>
            <KpiTile label="Total Assets" value={kpis?.assets.total ?? 0} phosphor="package" to="/assets" />
            <KpiTile label="Available" value={kpis?.assets.available ?? 0} phosphor="check-circle" to="/assets" />
            <KpiTile label="Maintenance" value={kpis?.assets.underMaintenance ?? 0} phosphor="wrench" to="/maintenance" />
            <KpiTile label="Approvals" value={kpis?.approvals.pending ?? 0} phosphor="clock" to="/approvals" />
          </>
        )}
        {role === 'ASSET_MANAGER' && (
          <>
            <KpiTile label="Allocated" value={kpis?.assets.allocated ?? 0} phosphor="package" to="/assets" />
            <KpiTile label="Available" value={kpis?.assets.available ?? 0} phosphor="check-circle" to="/assets" />
            <KpiTile label="Approvals" value={kpis?.approvals.pending ?? 0} phosphor="clock" to="/approvals" />
            <KpiTile label="Overdue" value={kpis?.approvals.overdue ?? 0} phosphor="warning" to="/approvals" />
          </>
        )}
        {role === 'DEPARTMENT_HEAD' && (
          <>
            <KpiTile label="Dept Assets" value={kpis?.assets.total ?? 0} phosphor="package" to="/assets" />
            <KpiTile label="Approvals" value={kpis?.approvals.pending ?? 0} phosphor="clock" to="/approvals" />
            <KpiTile label="In Flight" value={kpis?.maintenance.inProgress ?? 0} phosphor="wrench" to="/maintenance" />
            <KpiTile label="Unread" value={kpis?.notifications.unread ?? 0} phosphor="bell" to="/notifications" />
          </>
        )}
        {role === 'EMPLOYEE' && (
          <>
            <KpiTile label="My Requests" value={kpis?.maintenance.pending ?? 0} phosphor="wrench" to="/maintenance" />
            <KpiTile label="Approvals" value={kpis?.approvals.pending ?? 0} phosphor="clock" to="/approvals" />
            <KpiTile label="Unread" value={kpis?.notifications.unread ?? 0} phosphor="bell" to="/notifications" />
            <KpiTile label="Resolved" value={kpis?.maintenance.resolvedThisMonth ?? 0} phosphor="check-circle" to="/maintenance" />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <div className="mb-4 flex items-center gap-4">
          <div className="h-[2px] flex-1 bg-recessed" style={{ boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.1)' }} />
          <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-ink">Quick Actions</h2>
          <div className="h-[2px] flex-1 bg-recessed" style={{ boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.1)' }} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.to} to={action.to}>
              <Card className="group flex h-full flex-col items-center gap-3 text-center transition-all">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-chassis transition-transform group-hover:scale-110" style={{ boxShadow: '6px 6px 12px #babecc, -6px -6px 12px #ffffff' }}>
                  <i className={`ph-bold ${action.phosphor}`} style={{ fontSize: 22, color: '#ff4757' }} />
                </div>
                <div>
                  <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink">{action.label}</p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-label">{action.hint}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      {kpis && kpis.recentActivity.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-4">
            <div className="h-[2px] flex-1 bg-recessed" style={{ boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.1)' }} />
            <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-ink">Recent Activity</h2>
            <div className="h-[2px] flex-1 bg-recessed" style={{ boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.1)' }} />
          </div>
          <Card bolted={false} className="divide-y divide-ink-200">
            {kpis.recentActivity.map((a) => (
              <ActivityItem key={a.id} activity={a} />
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
