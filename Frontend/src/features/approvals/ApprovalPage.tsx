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
  searchApprovals,
  getPendingApprovals,
  getApprovalStatusCounts,
  approveApproval,
  rejectApproval,
  upsertRule,
  getDelegations,
  createDelegation,
  revokeDelegation,
} from '@/features/approvals/api';
import { listEmployees } from '@/features/employees/api';
import { useAuthStore } from '@/store/auth.store';
import type { Approval, ApprovalStatus, ApprovalType, ApprovalDelegation } from '@/types/domain.types';

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
  CUSTOM: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300',
};

const decideSchema = z.object({
  comment: z.string().max(500).optional(),
});

type DecideForm = z.infer<typeof decideSchema>;

const delegationSchema = z.object({
  delegateUserId: z.string().min(1, 'Delegate is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
});

type DelegationForm = z.infer<typeof delegationSchema>;

const ruleSchema = z.object({
  approvalType: z.string().min(1, 'Type is required'),
  slaHours: z.coerce.number().min(1, 'SLA must be at least 1 hour'),
  escalateToRole: z.string().min(1, 'Escalation role is required'),
});

// z.coerce.number() has a narrower output type (number) than input type
// (unknown, since it accepts strings from the form before coercing). RHF's
// third useForm generic (TTransformedValues) lets handleSubmit's callback
// still receive the coerced output type while the form itself holds input.
type RuleForm = z.input<typeof ruleSchema>;
type RuleFormOutput = z.output<typeof ruleSchema>;

export function ApprovalPage() {
  const queryClient = useQueryClient();
  const userRole = useAuthStore((s) => s.user?.role);
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'delegations' | 'rules'>('pending');
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<ApprovalType | ''>('');
  const [search, setSearch] = useState('');
  const [decideId, setDecideId] = useState<string | null>(null);
  const [decideAction, setDecideAction] = useState<'approve' | 'reject'>('approve');
  const [showDelegation, setShowDelegation] = useState(false);
  const [showRule, setShowRule] = useState(false);
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

  const { data: delegations = [], isLoading: loadingDelegations } = useQuery({
    queryKey: ['approvals-delegations'],
    queryFn: getDelegations,
    enabled: activeTab === 'delegations',
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => listEmployees(),
    enabled: activeTab === 'delegations' || activeTab === 'rules',
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

  const createDelegationMutation = useMutation({
    mutationFn: createDelegation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals-delegations'] });
      setShowDelegation(false);
      setError('');
    },
    onError: (err) => {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to create delegation');
    },
  });

  const revokeDelegationMutation = useMutation({
    mutationFn: revokeDelegation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['approvals-delegations'] }),
  });

  const upsertRuleMutation = useMutation({
    mutationFn: upsertRule,
    onSuccess: () => {
      setShowRule(false);
      setError('');
    },
    onError: (err) => {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to save rule');
    },
  });

  const {
    register: registerDecide,
    handleSubmit: handleSubmitDecide,
    reset: resetDecide,
    formState: { errors: decideErrors },
  } = useForm<DecideForm>({ resolver: zodResolver(decideSchema) });

  const {
    register: registerDelegation,
    handleSubmit: handleSubmitDelegation,
    reset: resetDelegation,
    formState: { errors: delegationErrors },
  } = useForm<DelegationForm>({ resolver: zodResolver(delegationSchema) });

  const {
    register: registerRule,
    handleSubmit: handleSubmitRule,
    reset: resetRule,
    formState: { errors: ruleErrors },
  } = useForm<RuleForm, unknown, RuleFormOutput>({ resolver: zodResolver(ruleSchema) });

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
    resetDecide();
  };

  const employeeOptions = (employees as { id: string; name: string }[]).map((e) => ({ value: e.id, label: e.name }));

  const approvals = activeTab === 'pending' ? pendingApprovals : allApprovals;
  const isLoading = activeTab === 'pending' ? loadingPending : activeTab === 'all' ? loadingAll : loadingDelegations;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900 text-black">Approvals</h1>
        <p className="text-sm text-ink-500">Review and manage approval requests across the organization.</p>
      </div>

      {statusCounts && activeTab !== 'delegations' && activeTab !== 'rules' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(statusCounts as Record<string, number>).map(([status, count]) => (
            <Card key={status} className="flex flex-col items-center gap-1 py-3">
              <span className="font-display text-2xl font-bold text-ink-900 text-black">{count}</span>
              <span className="text-xs text-ink-500">{status.replace(/_/g, ' ')}</span>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 border-b border-ink-200 dark:border-ink-700">
        {[
          { key: 'pending' as const, label: `My Pending (${pendingApprovals.length})` },
          { key: 'all' as const, label: 'All Approvals' },
          { key: 'delegations' as const, label: 'Delegations' },
          ...(userRole === 'ADMIN' ? [{ key: 'rules' as const, label: 'Rules' }] : []),
        ].map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-brand-600 text-brand-800 dark:border-brand-500 dark:text-brand-300'
                : 'border-transparent text-ink-500 hover:text-ink-700'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'all' && (
        <div className="flex flex-wrap items-end gap-3">
          <Input label="" placeholder="Search approvals..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
          <Select label="" options={STATUS_OPTIONS} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ApprovalStatus | '')} className="w-48" />
          <Select label="" options={TYPE_OPTIONS} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as ApprovalType | '')} className="w-48" />
        </div>
      )}

      {isLoading && <p className="text-sm text-ink-500">Loading…</p>}

      {/* ── Approvals Table ──────────────────────────────────────────── */}
      {(activeTab === 'pending' || activeTab === 'all') && !isLoading && approvals.length === 0 && (
        <EmptyState
          icon="check-circle"
          title={activeTab === 'pending' ? 'Nothing waiting on you' : 'No approvals found'}
          description={activeTab === 'pending' ? "You're all caught up." : 'Approval requests from other modules will show up here.'}
        />
      )}

      {(activeTab === 'pending' || activeTab === 'all') && approvals.length > 0 && (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-200 dark:border-ink-700">
                  <th className="px-5 py-3 font-medium text-ink-500">Type</th>
                  <th className="px-5 py-3 font-medium text-ink-500">Entity</th>
                  <th className="px-5 py-3 font-medium text-ink-500">Requested By</th>
                  <th className="px-5 py-3 font-medium text-ink-500">Approver</th>
                  <th className="px-5 py-3 font-medium text-ink-500">Status</th>
                  <th className="px-5 py-3 font-medium text-ink-500">Due</th>
                  <th className="px-5 py-3 font-medium text-ink-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                {approvals.map((a: Approval) => (
                  <tr key={a.id} className="transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                    <td className="px-5 py-2.5">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE_CLASS[a.type] ?? ''}`}>
                        {a.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-ink-600 dark:text-ink-400">
                      {a.entityType}: {a.entityId.slice(0, 8)}...
                    </td>
                    <td className="px-5 py-2.5 text-ink-600 dark:text-ink-400">
                      {a.requestedBy?.name ?? '—'}
                    </td>
                    <td className="px-5 py-2.5 text-ink-600 dark:text-ink-400">
                      {a.currentApprover?.name ?? '—'}
                    </td>
                    <td className="px-5 py-2.5"><StatusBadge status={a.status} /></td>
                    <td className="px-5 py-2.5 text-ink-600 dark:text-ink-400">
                      {new Date(a.dueAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-2.5">
                      {a.status === 'PENDING' || a.status === 'ESCALATED' ? (
                        <div className="flex items-center gap-3">
                          <button className="text-xs font-medium text-emerald-600 hover:underline" onClick={() => openDecide(a.id, 'approve')}>
                            Approve
                          </button>
                          <button className="text-xs font-medium text-red-600 hover:underline" onClick={() => openDecide(a.id, 'reject')}>
                            Reject
                          </button>
                        </div>
                      ) : a.status === 'APPROVED' ? (
                        <span className="text-xs text-emerald-600">Approved by {a.decidedBy?.name ?? '—'}</span>
                      ) : a.status === 'REJECTED' ? (
                        <span className="text-xs text-red-600">Rejected by {a.decidedBy?.name ?? '—'}</span>
                      ) : (
                        <span className="text-xs text-ink-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Delegations Tab ──────────────────────────────────────────── */}
      {activeTab === 'delegations' && !isLoading && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-500">Delegate your approval authority to another user for a date range.</p>
            <Button onClick={() => { setShowDelegation(true); setError(''); resetDelegation(); }}>+ New Delegation</Button>
          </div>
          {delegations.length === 0 ? (
            <EmptyState icon="arrows-clockwise" title="No delegations" description="Set up a delegation to let someone else handle your approvals while you're away." />
          ) : (
            <Card className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink-200 dark:border-ink-700">
                      <th className="px-5 py-3 font-medium text-ink-500">Delegate</th>
                      <th className="px-5 py-3 font-medium text-ink-500">Start Date</th>
                      <th className="px-5 py-3 font-medium text-ink-500">End Date</th>
                      <th className="px-5 py-3 font-medium text-ink-500">Status</th>
                      <th className="px-5 py-3 font-medium text-ink-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                    {delegations.map((d: ApprovalDelegation) => {
                      const now = new Date();
                      const start = new Date(d.startDate);
                      const end = new Date(d.endDate);
                      const isActive = d.active && start <= now && now <= end;
                      return (
                        <tr key={d.id}>
                          <td className="px-5 py-2.5 font-medium text-ink-900 text-black">{d.delegate?.name ?? d.delegateUserId}</td>
                          <td className="px-5 py-2.5 text-ink-600 dark:text-ink-400">{start.toLocaleDateString()}</td>
                          <td className="px-5 py-2.5 text-ink-600 dark:text-ink-400">{end.toLocaleDateString()}</td>
                          <td className="px-5 py-2.5">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400'}`}>
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-5 py-2.5">
                            <button
                              onClick={() => revokeDelegationMutation.mutate(d.id)}
                              className="text-xs font-medium text-red-600 hover:underline"
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Rules Tab (Admin only) ───────────────────────────────────── */}
      {activeTab === 'rules' && userRole === 'ADMIN' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-500">Configure approval SLA and escalation rules per type.</p>
            <Button onClick={() => { setShowRule(true); setError(''); resetRule(); }}>+ Set / Update Rule</Button>
          </div>
          <Card className="p-6">
            <p className="text-sm text-ink-500">Rules define the SLA (hours) and escalation target role for each approval type. When an approval is not decided within the SLA, the escalation cron (every 15 min) will reassign it to a user with the escalation role.</p>
          </Card>
        </div>
      )}

      {/* ── Approve/Reject Modal ─────────────────────────────────────── */}
      <Modal open={!!decideId} onClose={() => setDecideId(null)} title={`${decideAction === 'approve' ? 'Approve' : 'Reject'} Request`}>
        <form className="flex flex-col gap-4" onSubmit={handleSubmitDecide(onSubmitDecide)}>
          <Input label="Comment (optional)" placeholder="Add a comment..." error={decideErrors.comment?.message} {...registerDecide('comment')} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" variant={decideAction === 'approve' ? 'primary' : 'secondary'} isLoading={approveMutation.isPending || rejectMutation.isPending}>
            {decideAction === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </form>
      </Modal>

      {/* ── Create Delegation Modal ──────────────────────────────────── */}
      <Modal open={showDelegation} onClose={() => setShowDelegation(false)} title="Create Delegation">
        <form className="flex flex-col gap-4" onSubmit={handleSubmitDelegation((data) => createDelegationMutation.mutate(data))}>
          <Select label="Delegate" options={employeeOptions} placeholder="Select a user" error={delegationErrors.delegateUserId?.message} {...registerDelegation('delegateUserId')} />
          <Input label="Start Date" type="date" error={delegationErrors.startDate?.message} {...registerDelegation('startDate')} />
          <Input label="End Date" type="date" error={delegationErrors.endDate?.message} {...registerDelegation('endDate')} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" isLoading={createDelegationMutation.isPending}>Create</Button>
        </form>
      </Modal>

      {/* ── Set Rule Modal ───────────────────────────────────────────── */}
      <Modal open={showRule} onClose={() => setShowRule(false)} title="Set Approval Rule">
        <form className="flex flex-col gap-4" onSubmit={handleSubmitRule((data) => upsertRuleMutation.mutate({ approvalType: data.approvalType as ApprovalType, slaHours: data.slaHours, escalateToRole: data.escalateToRole }))}>
          <Select
            label="Approval Type"
            options={TYPE_OPTIONS.filter((o) => o.value !== '')}
            error={ruleErrors.approvalType?.message}
            {...registerRule('approvalType')}
          />
          <Input label="SLA (hours)" type="number" placeholder="48" error={ruleErrors.slaHours?.message} {...registerRule('slaHours')} />
          <Select
            label="Escalate To Role"
            options={[
              { value: 'ADMIN', label: 'Admin' },
              { value: 'ASSET_MANAGER', label: 'Asset Manager' },
            ]}
            error={ruleErrors.escalateToRole?.message}
            {...registerRule('escalateToRole')}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" isLoading={upsertRuleMutation.isPending}>Save Rule</Button>
        </form>
      </Modal>
    </div>
  );
}
