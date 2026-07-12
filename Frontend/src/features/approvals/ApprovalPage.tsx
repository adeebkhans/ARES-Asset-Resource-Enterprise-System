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
import { ApiRequestError } from '@/types/api.types';
import {
  searchApprovals,
  getPendingApprovals,
  getApprovalStatusCounts,
  approveApproval,
  rejectApproval,
} from '@/features/approvals/api';
import type { Approval, ApprovalStatus, ApprovalType } from '@/types/domain.types';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ESCALATED', label: 'Escalated' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'AUDIT_DISCREPANCY', label: 'Audit Discrepancy' },
  { value: 'CUSTOM', label: 'Custom' },
];

const TYPE_BADGE_CLASS: Record<string, string> = {
  MAINTENANCE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  TRANSFER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  AUDIT_DISCREPANCY: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  CUSTOM: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const decideSchema = z.object({
  comment: z.string().max(500).optional(),
});

type DecideForm = z.infer<typeof decideSchema>;

export function ApprovalPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<ApprovalType | ''>('');
  const [search, setSearch] = useState('');
  const [decideId, setDecideId] = useState<string | null>(null);
  const [decideAction, setDecideAction] = useState<'approve' | 'reject'>('approve');
  const [error, setError] = useState('');

  const { data: pendingApprovals = [], isLoading: loadingPending } = useQuery({
    queryKey: ['approvals-pending'],
    queryFn: getPendingApprovals,
    enabled: activeTab === 'pending',
  });

  const { data: allApprovals = [], isLoading: loadingAll } = useQuery({
    queryKey: ['approvals', statusFilter, typeFilter, search],
    queryFn: () => searchApprovals({
      status: (statusFilter as ApprovalStatus) || undefined,
      type: (typeFilter as ApprovalType) || undefined,
    }),
    enabled: activeTab === 'all',
  });

  const { data: statusCounts } = useQuery({
    queryKey: ['approval-status-counts'],
    queryFn: getApprovalStatusCounts,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      approveApproval(id, comment ? { comment } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approvals-pending'] });
      queryClient.invalidateQueries({ queryKey: ['approval-status-counts'] });
      setDecideId(null);
      setError('');
    },
    onError: (err) => {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to approve');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      rejectApproval(id, comment ? { comment } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approvals-pending'] });
      queryClient.invalidateQueries({ queryKey: ['approval-status-counts'] });
      setDecideId(null);
      setError('');
    },
    onError: (err) => {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to reject');
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: formErrors },
  } = useForm<DecideForm>({ resolver: zodResolver(decideSchema) });

  const onSubmitDecide = (data: DecideForm) => {
    if (!decideId) return;
    if (decideAction === 'approve') {
      approveMutation.mutate({ id: decideId, comment: data.comment });
    } else {
      rejectMutation.mutate({ id: decideId, comment: data.comment });
    }
  };

  const openDecide = (id: string, action: 'approve' | 'reject') => {
    setDecideId(id);
    setDecideAction(action);
    setError('');
    reset();
  };

  const approvals = activeTab === 'pending' ? pendingApprovals : allApprovals;
  const isLoading = activeTab === 'pending' ? loadingPending : loadingAll;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Approvals</h1>
        <p className="text-sm text-slate-500">Review and manage approval requests across the organization.</p>
      </div>

      {statusCounts && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(statusCounts as Record<string, number>).map(([status, count]) => (
            <Card key={status} className="flex flex-col items-center gap-1 py-3">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{count}</span>
              <span className="text-xs text-slate-500">{status.replace(/_/g, ' ')}</span>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'pending'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('pending')}
        >
          My Pending ({pendingApprovals.length})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('all')}
        >
          All Approvals
        </button>
      </div>

      {activeTab === 'all' && (
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label=""
            placeholder="Search approvals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Select
            label=""
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ApprovalStatus | '')}
            className="w-48"
          />
          <Select
            label=""
            options={TYPE_OPTIONS}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ApprovalType | '')}
            className="w-48"
          />
        </div>
      )}

      {isLoading && <p className="text-sm text-slate-500">Loading...</p>}

      {!isLoading && approvals.length === 0 && (
        <p className="text-sm text-slate-500">
          {activeTab === 'pending' ? 'No pending approvals.' : 'No approvals found.'}
        </p>
      )}

      {approvals.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="pb-2 font-medium text-slate-500">Type</th>
                <th className="pb-2 font-medium text-slate-500">Entity</th>
                <th className="pb-2 font-medium text-slate-500">Requested By</th>
                <th className="pb-2 font-medium text-slate-500">Approver</th>
                <th className="pb-2 font-medium text-slate-500">Status</th>
                <th className="pb-2 font-medium text-slate-500">Due</th>
                <th className="pb-2 font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {approvals.map((a: Approval) => (
                <tr key={a.id}>
                  <td className="py-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE_CLASS[a.type] ?? ''}`}>
                      {a.type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-2 text-slate-600 dark:text-slate-400">
                    {a.entityType}: {a.entityId.slice(0, 8)}...
                  </td>
                  <td className="py-2 text-slate-600 dark:text-slate-400">
                    {a.requestedBy?.name ?? '—'}
                  </td>
                  <td className="py-2 text-slate-600 dark:text-slate-400">
                    {a.currentApprover?.name ?? '—'}
                  </td>
                  <td className="py-2"><StatusBadge status={a.status} /></td>
                  <td className="py-2 text-slate-600 dark:text-slate-400">
                    {new Date(a.dueAt).toLocaleDateString()}
                  </td>
                  <td className="py-2">
                    {a.status === 'PENDING' || a.status === 'ESCALATED' ? (
                      <div className="flex items-center gap-2">
                        <button
                          className="text-xs text-green-600 hover:underline"
                          onClick={() => openDecide(a.id, 'approve')}
                        >
                          Approve
                        </button>
                        <button
                          className="text-xs text-red-600 hover:underline"
                          onClick={() => openDecide(a.id, 'reject')}
                        >
                          Reject
                        </button>
                      </div>
                    ) : a.status === 'APPROVED' ? (
                      <span className="text-xs text-green-600">
                        Approved by {a.decidedBy?.name ?? '—'}
                      </span>
                    ) : a.status === 'REJECTED' ? (
                      <span className="text-xs text-red-600">
                        Rejected by {a.decidedBy?.name ?? '—'}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!decideId} onClose={() => setDecideId(null)} title={`${decideAction === 'approve' ? 'Approve' : 'Reject'} Request`}>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmitDecide)}>
          <Input
            label="Comment (optional)"
            placeholder="Add a comment..."
            error={formErrors.comment?.message}
            {...register('comment')}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            type="submit"
            variant={decideAction === 'approve' ? 'primary' : 'secondary'}
            isLoading={approveMutation.isPending || rejectMutation.isPending}
          >
            {decideAction === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
