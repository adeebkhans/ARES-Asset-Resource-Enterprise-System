import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { fetchMe } from '@/features/auth/api';
import { getAssetStatusCounts } from '@/features/assets/api';
import { getMaintenanceStatusCounts } from '@/features/maintenance/api';
import { getApprovalStatusCounts } from '@/features/approvals/api';
import { getUnreadCount } from '@/features/notifications/api';

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

const QUICK_ACTIONS = [
  { to: '/assets', label: 'Register an Asset', icon: '📦', hint: 'Add a new item to the directory' },
  { to: '/maintenance', label: 'Raise Maintenance', icon: '🔧', hint: 'Report an issue with an asset' },
  { to: '/custom-objects', label: 'Model a New Entity', icon: '🧩', hint: 'Not everything is an Asset' },
];

/**
 * Phase 0 placeholder proved the session round-trip; this now pulls real
 * cross-module counts. Role-aware *layouts* (not just filtered data) are a
 * Phase 6 item (plan.md §8.5) — for now every role sees the same widgets.
 */
export function DashboardPage() {
  const { data: me } = useQuery({ queryKey: ['auth', 'me'], queryFn: fetchMe });
  const { data: assetCounts } = useQuery({ queryKey: ['asset-status-counts'], queryFn: getAssetStatusCounts });
  const { data: maintenanceCounts } = useQuery({ queryKey: ['maintenance-status-counts'], queryFn: getMaintenanceStatusCounts });
  const { data: approvalCounts } = useQuery({ queryKey: ['approval-status-counts'], queryFn: getApprovalStatusCounts });
  const { data: unread } = useQuery({ queryKey: ['notifications-unread-count'], queryFn: getUnreadCount });

  const availableAssets = assetCounts?.AVAILABLE ?? 0;
  const pendingMaintenance = (maintenanceCounts?.PENDING ?? 0) + (maintenanceCounts?.APPROVED ?? 0) + (maintenanceCounts?.IN_PROGRESS ?? 0);
  const pendingApprovals = approvalCounts?.PENDING ?? 0;
  const unreadNotifications = unread?.count ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm font-medium text-brand-600 dark:text-brand-400">{GREETING_HOUR()}, {me?.name?.split(' ')[0] ?? ''}</p>
        <h1 className="font-display text-3xl font-semibold text-ink-900 dark:text-white">Dashboard</h1>
        {me && <p className="text-sm text-ink-500">Signed in as {ROLE_LABEL[me.role] ?? me.role} · {me.email}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiTile label="Assets available" value={availableAssets} tone="bg-emerald-500" to="/assets" />
        <KpiTile label="Maintenance in flight" value={pendingMaintenance} tone="bg-amber-500" to="/maintenance" />
        <KpiTile label="Approvals waiting on you" value={pendingApprovals} tone="bg-brand-500" to="/approvals" />
        <KpiTile label="Unread notifications" value={unreadNotifications} tone="bg-sky-500" to="/notifications" />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {QUICK_ACTIONS.map((action) => (
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
    </div>
  );
}
