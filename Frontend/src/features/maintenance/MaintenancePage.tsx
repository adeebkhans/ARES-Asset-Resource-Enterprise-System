import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiRequestError } from '@/types/api.types';
import {
  searchMaintenance,
  createMaintenanceRequest,
  updateMaintenanceStatus,
  getMaintenanceStatusCounts,
} from '@/features/maintenance/api';
import type { MaintenanceRequest, MaintenanceStatus, MaintenancePriority } from '@/types/domain.types';

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const PRIORITY_BADGE_CLASS: Record<string, string> = {
  LOW: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  HIGH: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const createRequestSchema = z.object({
  assetId: z.string().min(1, 'Asset ID is required'),
  issueDescription: z.string().min(10, 'Description must be at least 10 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

type CreateRequestForm = z.infer<typeof createRequestSchema>;

const resolveStatusSchema = z.object({
  technicianName: z.string().optional(),
  resolutionNotes: z.string().min(1, 'Resolution notes are required'),
});

type ResolveStatusForm = z.infer<typeof resolveStatusSchema>;

export function MaintenancePage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showResolve, setShowResolve] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | ''>('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['maintenance', statusFilter, search],
    queryFn: () =>
      searchMaintenance({
        status: (statusFilter as MaintenanceStatus) || undefined,
        search: search || undefined,
      }),
  });

  const { data: statusCounts } = useQuery({
    queryKey: ['maintenance-status-counts'],
    queryFn: getMaintenanceStatusCounts,
  });

  const createMutation = useMutation({
    mutationFn: createMaintenanceRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-status-counts'] });
      setShowCreate(false);
      setError('');
    },
    onError: (err) => {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to create request');
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ResolveStatusForm }) =>
      updateMaintenanceStatus(id, {
        status: 'RESOLVED',
        technicianName: data.technicianName || undefined,
        resolutionNotes: data.resolutionNotes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-status-counts'] });
      setShowResolve(null);
      setError('');
    },
    onError: (err) => {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to resolve request');
    },
  });

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm<CreateRequestForm>({ resolver: zodResolver(createRequestSchema) });

  const {
    register: registerResolve,
    handleSubmit: handleSubmitResolve,
    reset: resetResolve,
    formState: { errors: resolveErrors },
  } = useForm<ResolveStatusForm>({ resolver: zodResolver(resolveStatusSchema) });

  const onSubmitCreate = (data: CreateRequestForm) => {
    createMutation.mutate({
      assetId: data.assetId,
      issueDescription: data.issueDescription,
      priority: (data.priority as MaintenancePriority) || undefined,
    });
  };

  const onSubmitResolve = (data: ResolveStatusForm) => {
    if (showResolve) resolveMutation.mutate({ id: showResolve, data });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 text-black">Maintenance</h1>
          <p className="text-sm text-ink-500">Track and resolve asset maintenance requests.</p>
        </div>
        <Button onClick={() => { setShowCreate(true); setError(''); resetCreate(); }}>+ Raise Request</Button>
      </div>

      {statusCounts && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(statusCounts as Record<string, number>).map(([status, count]) => (
            <Card key={status} className="flex flex-col items-center gap-1 py-3">
              <span className="font-display text-2xl font-bold text-ink-900 text-black">{count}</span>
              <span className="text-xs text-ink-500">{status.replace(/_/g, ' ')}</span>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <Input
          label=""
          placeholder="Search requests..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select
          label=""
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as MaintenanceStatus | '')}
          className="w-48"
        />
      </div>

      {isLoading && <p className="text-sm text-ink-500">Loading…</p>}

      {!isLoading && requests.length === 0 && (
        <EmptyState icon="wrench" title="No maintenance requests" description="Requests raised against your assets will show up here." />
      )}

      {requests.length > 0 && (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-200 dark:border-ink-700">
                  <th className="px-5 py-3 font-medium text-ink-500">Asset</th>
                  <th className="px-5 py-3 font-medium text-ink-500">Issue</th>
                  <th className="px-5 py-3 font-medium text-ink-500">Priority</th>
                  <th className="px-5 py-3 font-medium text-ink-500">Raised By</th>
                  <th className="px-5 py-3 font-medium text-ink-500">Status</th>
                  <th className="px-5 py-3 font-medium text-ink-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                {requests.map((req: MaintenanceRequest) => (
                  <tr key={req.id} className="transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                    <td className="px-5 py-2.5 font-medium text-ink-900 text-black">
                      {req.asset?.name ?? req.assetId}
                    </td>
                    <td className="max-w-xs truncate px-5 py-2.5 text-ink-600 dark:text-ink-400">
                      {req.issueDescription}
                    </td>
                    <td className="px-5 py-2.5">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE_CLASS[req.priority] ?? ''}`}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-ink-600 dark:text-ink-400">
                      {req.raisedBy?.name ?? '—'}
                    </td>
                    <td className="px-5 py-2.5"><StatusBadge status={req.status} /></td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-1">
                        {req.status === 'PENDING' && (
                          <span className="text-xs text-amber-600">Awaiting Approval</span>
                        )}
                        {req.status === 'APPROVED' && (
                          <button
                            className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
                            onClick={() => { setShowResolve(req.id); resetResolve(); }}
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Raise Maintenance Request">
        <form className="flex flex-col gap-4" onSubmit={handleSubmitCreate(onSubmitCreate)}>
          <Input
            label="Asset ID"
            placeholder="Enter asset ID"
            error={createErrors.assetId?.message}
            {...registerCreate('assetId')}
          />
          <Input
            label="Issue Description"
            placeholder="Describe the issue"
            error={createErrors.issueDescription?.message}
            {...registerCreate('issueDescription')}
          />
          <Select
            label="Priority"
            options={[{ value: '', label: 'Select priority' }, ...PRIORITY_OPTIONS]}
            {...registerCreate('priority')}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" isLoading={createMutation.isPending}>Submit Request</Button>
        </form>
      </Modal>

      <Modal
        open={!!showResolve}
        onClose={() => setShowResolve(null)}
        title="Resolve Maintenance Request"
      >
        <form className="flex flex-col gap-4" onSubmit={handleSubmitResolve(onSubmitResolve)}>
          <Input label="Technician Name (optional)" {...registerResolve('technicianName')} />
          <Input
            label="Resolution Notes"
            placeholder="Describe the resolution"
            error={resolveErrors.resolutionNotes?.message}
            {...registerResolve('resolutionNotes')}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" isLoading={resolveMutation.isPending}>Mark Resolved</Button>
        </form>
      </Modal>
    </div>
  );
}
