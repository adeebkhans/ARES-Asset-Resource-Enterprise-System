import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { fetchMe } from '@/features/auth/api';

/**
 * Phase 0 placeholder: proves the authenticated shell + session validation
 * round-trip (GET /auth/me on load). Phase 6 replaces this body with
 * genuinely different per-role KPI layouts (plan.md §8.5).
 */
export function DashboardPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['auth', 'me'], queryFn: fetchMe });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-500">Role-aware KPI widgets land in a later phase.</p>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Session</h2>
        {isLoading && <p className="text-sm text-slate-500">Validating session…</p>}
        {isError && <p className="text-sm text-red-600 dark:text-red-400">Could not validate session.</p>}
        {data && (
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{data.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{data.email}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Role</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{data.role}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{data.status}</dd>
            </div>
          </dl>
        )}
      </Card>
    </div>
  );
}
