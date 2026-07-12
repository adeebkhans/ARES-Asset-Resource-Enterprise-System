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
  tone: string;
  to: string;
}

function KpiTile({ label, value, tone, to }: KpiTileProps) {
  return (
    <Link to={to}>
      <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
        <span className={`absolute inset-x-0 top-0 h-1 ${tone}`} />
        <span className="block font-display text-3xl font-semibold text-ink-900 dark:text-white">{value}</span>
        <span className="text-sm text-ink-500">{label}</span>
      </Card>
    </Link>
  );
}

const QUICK_ACTIONS_BY_ROLE: Record<string, { to: string; label: string; icon: string; hint: string }[]> = {
  ADMIN: [
    { to: '/assets', label: 'Register an Asset', icon: '📦', hint: 'Add a new item to the directory' },
    { to: '/maintenance', label: 'Raise Maintenance', icon: '🔧', hint: 'Report an issue with an asset' },
    { to: '/org-setup', label: 'Org Setup', icon: '🏢', hint: 'Configure departments, categories & employees' },
    { to: '/custom-objects', label: 'Model a New Entity', icon: '🧩', hint: 'Not everything is an Asset' },
  ],
  ASSET_MANAGER: [
    { to: '/assets', label: 'Register an Asset', icon: '📦', hint: 'Add a new item to the directory' },
    { to: '/maintenance', label: 'Raise Maintenance', icon: '🔧', hint: 'Report an issue with an asset' },
    { to: '/approvals', label: 'Review Approvals', icon: '✅', hint: 'Approve or reject pending requests' },
  ],
  DEPARTMENT_HEAD: [
    { to: '/assets', label: 'View Department Assets', icon: '📦', hint: 'See assets under your department' },
    { to: '/maintenance', label: 'Raise Maintenance', icon: '🔧', hint: 'Report an issue with an asset' },
    { to: '/approvals', label: 'Review Approvals', icon: '✅', hint: 'Approve or reject pending requests' },
  ],
  EMPLOYEE: [
    { to: '/assets', label: 'Browse Assets', icon: '📦', hint: 'View available assets' },
    { to: '/maintenance', label: 'Raise Maintenance', icon: '🔧', hint: 'Report an issue with an asset' },
  ],
};

function ActivityItem({ activity }: { activity: { action: string; entityType: string; timestamp: string; user?: { name: string } | null } }) {
  const timeAgo = getTimeAgo(activity.timestamp);
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink-700 dark:text-ink-300">
          {activity.user?.name ?? 'System'} {activity.action} a {activity.entityType.toLowerCase().replace(/_/g, ' ')}
        </p>
        <p className="text-xs text-ink-400">{timeAgo}</p>
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

/**
 * Role-aware dashboard (plan.md §8.5).
 * Admins see org-wide KPIs including total asset count.
 * Asset Managers see asset + approval focus.
 * Department Heads see department-scoped KPIs.
 * Employees see only their own requests and notifications.
 */
export function DashboardPage() {
  const { data: me } = useQuery({ queryKey: ['auth', 'me'], queryFn: fetchMe });
  const { data: kpis, isLoading } = useQuery({ queryKey: ['dashboard-kpis'], queryFn: getDashboardKpis });

  const role = me?.role ?? 'EMPLOYEE';
  const quickActions = QUICK_ACTIONS_BY_ROLE[role] ?? QUICK_ACTIONS_BY_ROLE.EMPLOYEE;

  if (isLoading) {
    return <div className="py-12 text-center text-ink-500">Loading dashboard…</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm font-medium text-brand-600 dark:text-brand-400">{GREETING_HOUR()}, {me?.name?.split(' ')[0] ?? ''}</p>
        <h1 className="font-display text-3xl font-semibold text-ink-900 dark:text-white">Dashboard</h1>
        {me && <p className="text-sm text-ink-500">Signed in as {ROLE_LABEL[me.role] ?? me.role} · {me.email}</p>}
      </div>

      {/* ── KPI Tiles ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {role === 'ADMIN' && (
          <>
            <KpiTile label="Total assets" value={kpis?.assets.total ?? 0} tone="bg-brand-500" to="/assets" />
            <KpiTile label="Available assets" value={kpis?.assets.available ?? 0} tone="bg-emerald-500" to="/assets" />
            <KpiTile label="Under maintenance" value={kpis?.assets.underMaintenance ?? 0} tone="bg-amber-500" to="/maintenance" />
            <KpiTile label="Pending approvals" value={kpis?.approvals.pending ?? 0} tone="bg-sky-500" to="/approvals" />
          </>
        )}
        {role === 'ASSET_MANAGER' && (
          <>
            <KpiTile label="Allocated assets" value={kpis?.assets.allocated ?? 0} tone="bg-brand-500" to="/assets" />
            <KpiTile label="Available assets" value={kpis?.assets.available ?? 0} tone="bg-emerald-500" to="/assets" />
            <KpiTile label="Pending approvals" value={kpis?.approvals.pending ?? 0} tone="bg-amber-500" to="/approvals" />
            <KpiTile label="Overdue approvals" value={kpis?.approvals.overdue ?? 0} tone="bg-red-500" to="/approvals" />
          </>
        )}
        {role === 'DEPARTMENT_HEAD' && (
          <>
            <KpiTile label="Dept. assets" value={kpis?.assets.total ?? 0} tone="bg-brand-500" to="/assets" />
            <KpiTile label="Pending approvals" value={kpis?.approvals.pending ?? 0} tone="bg-amber-500" to="/approvals" />
            <KpiTile label="Maintenance in flight" value={kpis?.maintenance.inProgress ?? 0} tone="bg-sky-500" to="/maintenance" />
            <KpiTile label="Unread notifications" value={kpis?.notifications.unread ?? 0} tone="bg-emerald-500" to="/notifications" />
          </>
        )}
        {role === 'EMPLOYEE' && (
          <>
            <KpiTile label="My maintenance requests" value={kpis?.maintenance.pending ?? 0} tone="bg-brand-500" to="/maintenance" />
            <KpiTile label="My pending approvals" value={kpis?.approvals.pending ?? 0} tone="bg-amber-500" to="/approvals" />
            <KpiTile label="Unread notifications" value={kpis?.notifications.unread ?? 0} tone="bg-sky-500" to="/notifications" />
            <KpiTile label="Maintenance resolved" value={kpis?.maintenance.resolvedThisMonth ?? 0} tone="bg-emerald-500" to="/maintenance" />
          </>
        )}
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Link key={action.to} to={action.to}>
              <Card className="flex h-full items-start gap-3 transition-shadow hover:shadow-md">
                <span className="text-2xl">{action.icon}</span>
                <div>
                  <p className="font-medium text-ink-900 dark:text-white">{action.label}</p>
                  <p className="text-xs text-ink-500">{action.hint}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Recent Activity ────────────────────────────────────────── */}
      {kpis && kpis.recentActivity.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Recent Activity</h2>
          <Card className="divide-y divide-ink-100 dark:divide-ink-800">
            {kpis.recentActivity.map((a) => (
              <ActivityItem key={a.id} activity={a} />
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
