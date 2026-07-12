import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { listActivityLogs } from './api';
import type { ActivityLog } from '@/types/domain.types';

const ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'All entity types' },
  { value: 'Asset', label: 'Asset' },
  { value: 'MaintenanceRequest', label: 'Maintenance' },
  { value: 'AuditCycle', label: 'Audit' },
  { value: 'Approval', label: 'Approval' },
  { value: 'User', label: 'User' },
  { value: 'Department', label: 'Department' },
  { value: 'AssetCategory', label: 'Category' },
];

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

export function ActivityLogsPage() {
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['activity-logs', entityType, entityId],
    queryFn: () => listActivityLogs({
      entityType: entityType || undefined,
      entityId: entityId || undefined,
    }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-white">Activity Log</h1>
        <p className="text-sm text-ink-500">Audit trail of all system actions</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Select
          label=""
          options={ENTITY_TYPE_OPTIONS}
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="w-48"
        />
        <Input
          label=""
          placeholder="Filter by entity ID…"
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
          className="w-64"
        />
      </div>

      {isLoading && <p className="text-sm text-ink-500">Loading…</p>}

      {!isLoading && logs.length === 0 && (
        <EmptyState
          icon="📋"
          title="No activity logs"
          description={entityType || entityId ? 'Try clearing your filters.' : 'Actions will appear here as users interact with the system.'}
        />
      )}

      {logs.length > 0 && (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-200 dark:border-ink-700">
                  <th className="px-5 py-3 font-medium text-ink-500">Time</th>
                  <th className="px-5 py-3 font-medium text-ink-500">Action</th>
                  <th className="px-5 py-3 font-medium text-ink-500">Entity Type</th>
                  <th className="px-5 py-3 font-medium text-ink-500">Entity ID</th>
                  <th className="px-5 py-3 font-medium text-ink-500">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                {logs.map((log: ActivityLog) => (
                  <tr key={log.id} className="hover:bg-ink-50 dark:hover:bg-ink-800/50">
                    <td className="px-5 py-2.5 text-ink-500">{getTimeAgo(log.timestamp)}</td>
                    <td className="px-5 py-2.5 font-medium text-ink-900 dark:text-white">{log.action}</td>
                    <td className="px-5 py-2.5 text-ink-600 dark:text-ink-400">{log.entityType}</td>
                    <td className="px-5 py-2.5 font-mono text-xs text-ink-500">{log.entityId.slice(0, 8)}…</td>
                    <td className="px-5 py-2.5 text-ink-600 dark:text-ink-400">{log.userId.slice(0, 8)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
