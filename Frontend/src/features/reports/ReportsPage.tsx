import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { getFullReport } from './api';

function BarSegment({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-right text-xs text-ink-500">{label}</span>
      <div className="h-5 flex-1 overflow-hidden rounded bg-ink-100 dark:bg-ink-800">
        <div className={`h-full rounded ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-xs font-medium text-ink-700 dark:text-ink-300">{value}</span>
    </div>
  );
}

function TrendArrow({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up') return <span className="text-emerald-600">&#9650;</span>;
  if (trend === 'down') return <span className="text-red-500">&#9660;</span>;
  return <span className="text-ink-400">&#9644;</span>;
}

export function ReportsPage() {
  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', 'full'],
    queryFn: getFullReport,
  });

  if (isLoading) {
    return <div className="py-12 text-center text-ink-500">Loading reports…</div>;
  }

  if (!report) {
    return <div className="py-12 text-center text-ink-500">No report data available.</div>;
  }

  const { assetUtilization: au, maintenance: m, retirementForecast: rf, auditSummary } = report;
  const maxCategoryCount = Math.max(...au.byCategory.map((c) => c.count), 1);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink-900 dark:text-white">Reports & Analytics</h1>
        <p className="text-sm text-ink-500">Organizational intelligence at a glance</p>
      </div>

      {/* ── Asset Utilization ────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Asset Utilization</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="flex flex-col items-center justify-center p-6">
            <span className="font-display text-4xl font-bold text-ink-900 dark:text-white">{au.totalAssets}</span>
            <span className="text-xs text-ink-500">Total Assets</span>
          </Card>
          <Card className="flex flex-col items-center justify-center p-6">
            <span className="font-display text-4xl font-bold text-brand-700 dark:text-brand-400">{au.utilizationRate}%</span>
            <span className="text-xs text-ink-500">Utilization Rate</span>
          </Card>
          <Card className="flex flex-col gap-2 p-6">
            <span className="text-xs font-semibold text-ink-500">By Status</span>
            {Object.entries(au.byStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between text-sm">
                <span className="text-ink-600 dark:text-ink-400">{status.replace(/_/g, ' ')}</span>
                <span className="font-medium text-ink-900 dark:text-white">{count}</span>
              </div>
            ))}
          </Card>
        </div>
        {au.byCategory.length > 0 && (
          <Card className="mt-4 p-6">
            <span className="mb-4 block text-xs font-semibold text-ink-500">By Category</span>
            <div className="flex flex-col gap-2.5">
              {au.byCategory.map((cat) => (
                <BarSegment
                  key={cat.categoryId}
                  label={cat.categoryName}
                  value={cat.count}
                  max={maxCategoryCount}
                  color="bg-brand-600 dark:bg-brand-500"
                />
              ))}
            </div>
          </Card>
        )}
      </section>

      {/* ── Maintenance Performance ──────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Maintenance Performance</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Card className="p-6">
            <span className="block font-display text-3xl font-bold text-ink-900 dark:text-white">{m.totalRequests}</span>
            <span className="text-xs text-ink-500">Total Requests</span>
          </Card>
          <Card className="flex flex-col items-center justify-center p-6">
            <span className="text-3xl font-bold text-ink-900 dark:text-white">
              {m.averageResolutionDays ?? '—'}
            </span>
            <span className="text-xs text-ink-500">Avg Days to Resolve</span>
          </Card>
          <Card className="flex flex-col items-center justify-center p-6">
            <span className="flex items-center gap-2 text-3xl font-bold text-ink-900 dark:text-white">
              {m.resolvedThisMonth}
              <TrendArrow trend={m.trend} />
            </span>
            <span className="text-xs text-ink-500">Resolved This Month</span>
          </Card>
          <Card className="flex flex-col gap-2 p-6">
            <span className="text-xs font-semibold text-ink-500">By Priority</span>
            {Object.entries(m.byPriority).map(([p, count]) => (
              <div key={p} className="flex justify-between text-sm">
                <span className="text-ink-600 dark:text-ink-400">{p}</span>
                <span className="font-medium text-ink-900 dark:text-white">{count}</span>
              </div>
            ))}
          </Card>
        </div>
      </section>

      {/* ── Retirement Forecast ──────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Retirement Forecast</h2>
        {rf.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-500">No assets approaching retirement.</Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-200/70 text-xs font-semibold uppercase text-ink-500 dark:border-ink-700">
                <tr>
                  <th className="px-4 py-3">Asset Tag</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Age (months)</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                {rf.map((a) => (
                  <tr key={a.assetId} className="hover:bg-ink-50 dark:hover:bg-ink-800/50">
                    <td className="px-4 py-2.5 font-medium text-ink-900 dark:text-white">{a.assetTag}</td>
                    <td className="px-4 py-2.5 text-ink-700 dark:text-ink-300">{a.name}</td>
                    <td className="px-4 py-2.5 text-ink-600 dark:text-ink-400">{a.category}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-ink-900 dark:text-white">{a.ageMonths}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        {a.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {/* ── Audit Summary ────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Audit Summary</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="p-6">
            <span className="block font-display text-3xl font-bold text-ink-900 dark:text-white">{auditSummary.totalCycles}</span>
            <span className="text-xs text-ink-500">Total Cycles</span>
          </Card>
          <Card className="p-6">
            <span className="block font-display text-3xl font-bold text-emerald-600 dark:text-emerald-400">{auditSummary.completedCycles}</span>
            <span className="text-xs text-ink-500">Completed Cycles</span>
          </Card>
          <Card className="p-6">
            <span className="block font-display text-3xl font-bold text-red-600 dark:text-red-400">{auditSummary.totalDiscrepancies}</span>
            <span className="text-xs text-ink-500">Total Discrepancies</span>
          </Card>
        </div>
      </section>
    </div>
  );
}
