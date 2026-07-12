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
  searchAudits,
  createAuditCycle,
  updateAuditCycleStatus,
  submitAuditRecord,
  getAuditRecords,
  getAuditStatusCounts,
} from '@/features/audits/api';
import type { AuditCycle, AuditCycleStatus, AuditRecord } from '@/types/domain.types';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PLANNED', label: 'Planned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'CLOSED', label: 'Closed' },
];

const RESULT_OPTIONS = [
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'MISSING', label: 'Missing' },
  { value: 'DAMAGED', label: 'Damaged' },
];

const createCycleSchema = z.object({
  scopeDepartmentId: z.string().optional(),
  scopeLocation: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  auditorUserIds: z.string().min(1, 'At least one auditor ID is required'),
});

type CreateCycleForm = z.infer<typeof createCycleSchema>;

const submitRecordSchema = z.object({
  assetId: z.string().min(1, 'Asset ID is required'),
  result: z.enum(['VERIFIED', 'MISSING', 'DAMAGED']),
  notes: z.string().optional(),
});

type SubmitRecordForm = z.infer<typeof submitRecordSchema>;

export function AuditPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showRecords, setShowRecords] = useState<string | null>(null);
  const [showSubmitRecord, setShowSubmitRecord] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AuditCycleStatus | ''>('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const { data: cycles = [], isLoading } = useQuery({
    queryKey: ['audits', statusFilter, search],
    queryFn: () =>
      searchAudits({
        status: (statusFilter as AuditCycleStatus) || undefined,
        search: search || undefined,
      }),
  });

  const { data: statusCounts } = useQuery({
    queryKey: ['audit-status-counts'],
    queryFn: getAuditStatusCounts,
  });

  const { data: records = [] } = useQuery({
    queryKey: ['audit-records', showRecords],
    queryFn: () => getAuditRecords(showRecords!),
    enabled: !!showRecords,
  });

  const createMutation = useMutation({
    mutationFn: createAuditCycle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      queryClient.invalidateQueries({ queryKey: ['audit-status-counts'] });
      setShowCreate(false);
      setError('');
    },
    onError: (err) => {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to create cycle');
    },
  });

  const startCycleMutation = useMutation({
    mutationFn: (id: string) => updateAuditCycleStatus(id, { status: 'IN_PROGRESS' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      queryClient.invalidateQueries({ queryKey: ['audit-status-counts'] });
    },
  });

  const closeCycleMutation = useMutation({
    mutationFn: (id: string) => updateAuditCycleStatus(id, { status: 'CLOSED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      queryClient.invalidateQueries({ queryKey: ['audit-status-counts'] });
    },
  });

  const submitRecordMutation = useMutation({
    mutationFn: ({ cycleId, data }: { cycleId: string; data: SubmitRecordForm }) =>
      submitAuditRecord(cycleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      if (showRecords) queryClient.invalidateQueries({ queryKey: ['audit-records', showRecords] });
      setShowSubmitRecord(null);
      setError('');
    },
    onError: (err) => {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to submit record');
    },
  });

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm<CreateCycleForm>({ resolver: zodResolver(createCycleSchema) });

  const {
    register: registerRecord,
    handleSubmit: handleSubmitRecord,
    reset: resetRecord,
    formState: { errors: recordErrors },
  } = useForm<SubmitRecordForm>({ resolver: zodResolver(submitRecordSchema) });

  const onSubmitCreate = (data: CreateCycleForm) => {
    createMutation.mutate({
      scopeDepartmentId: data.scopeDepartmentId || undefined,
      scopeLocation: data.scopeLocation || undefined,
      startDate: data.startDate,
      endDate: data.endDate,
      auditorUserIds: data.auditorUserIds.split(',').map((s) => s.trim()).filter(Boolean),
    });
  };

  const onSubmitRecord = (data: SubmitRecordForm) => {
    if (showSubmitRecord) submitRecordMutation.mutate({ cycleId: showSubmitRecord, data });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-white">Audits</h1>
          <p className="text-sm text-ink-500">Plan audit cycles, assign auditors, and track discrepancies.</p>
        </div>
        <Button onClick={() => { setShowCreate(true); setError(''); resetCreate(); }}>+ Create Cycle</Button>
      </div>

      {statusCounts && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
          {Object.entries(statusCounts as Record<string, number>).map(([status, count]) => (
            <Card key={status} className="flex flex-col items-center gap-1 py-3">
              <span className="font-display text-2xl font-bold text-ink-900 dark:text-white">{count}</span>
              <span className="text-xs text-ink-500">{status.replace(/_/g, ' ')}</span>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <Input
          label=""
          placeholder="Search cycles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select
          label=""
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AuditCycleStatus | '')}
          className="w-48"
        />
      </div>

      {isLoading && <p className="text-sm text-ink-500">Loading…</p>}

      {!isLoading && cycles.length === 0 && (
        <EmptyState icon="🔍" title="No audit cycles" description="Create a cycle to start verifying assets against their expected state." />
      )}

      {cycles.length > 0 && (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-200 dark:border-ink-700">
                  <th className="px-5 py-3 font-medium text-ink-500">Department</th>
                  <th className="px-5 py-3 font-medium text-ink-500">Location</th>
                  <th className="px-5 py-3 font-medium text-ink-500">Dates</th>
                  <th className="px-5 py-3 font-medium text-ink-500">Auditors</th>
                  <th className="px-5 py-3 font-medium text-ink-500">Status</th>
                  <th className="px-5 py-3 font-medium text-ink-500">Records</th>
                  <th className="px-5 py-3 font-medium text-ink-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                {cycles.map((cycle: AuditCycle) => (
                  <tr key={cycle.id} className="transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                    <td className="px-5 py-2.5 text-ink-600 dark:text-ink-400">
                      {cycle.scopeDepartment?.name ?? 'All'}
                    </td>
                    <td className="px-5 py-2.5 text-ink-600 dark:text-ink-400">
                      {cycle.scopeLocation ?? '—'}
                    </td>
                    <td className="px-5 py-2.5 text-ink-600 dark:text-ink-400">
                      {new Date(cycle.startDate).toLocaleDateString()} – {new Date(cycle.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-2.5 text-ink-600 dark:text-ink-400">
                      {cycle.assignments?.map((a) => a.auditor.name).join(', ') ?? '—'}
                    </td>
                    <td className="px-5 py-2.5"><StatusBadge status={cycle.status} /></td>
                    <td className="px-5 py-2.5 text-ink-600 dark:text-ink-400">
                      {cycle._count?.records ?? 0}
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-3">
                        {cycle.status === 'PLANNED' && (
                          <button
                            className="text-xs font-medium text-emerald-600 hover:underline"
                            onClick={() => startCycleMutation.mutate(cycle.id)}
                          >
                            Start
                          </button>
                        )}
                        {cycle.status === 'IN_PROGRESS' && (
                          <>
                            <button
                              className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
                              onClick={() => {
                                setShowRecords(cycle.id);
                                setShowSubmitRecord(cycle.id);
                                resetRecord();
                                setError('');
                              }}
                            >
                              Submit Record
                            </button>
                            <button
                              className="text-xs font-medium text-red-600 hover:underline"
                              onClick={() => closeCycleMutation.mutate(cycle.id)}
                            >
                              Close Cycle
                            </button>
                          </>
                        )}
                        <button
                          className="text-xs font-medium text-ink-500 hover:underline"
                          onClick={() => setShowRecords(cycle.id)}
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Audit Cycle">
        <form className="flex flex-col gap-4" onSubmit={handleSubmitCreate(onSubmitCreate)}>
          <Input label="Start Date" type="date" error={createErrors.startDate?.message} {...registerCreate('startDate')} />
          <Input label="End Date" type="date" error={createErrors.endDate?.message} {...registerCreate('endDate')} />
          <Input label="Auditor IDs (comma-separated)" placeholder="user-id-1, user-id-2" error={createErrors.auditorUserIds?.message} {...registerCreate('auditorUserIds')} />
          <Input label="Scope Department (optional)" {...registerCreate('scopeDepartmentId')} />
          <Input label="Scope Location (optional)" {...registerCreate('scopeLocation')} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" isLoading={createMutation.isPending}>Create Cycle</Button>
        </form>
      </Modal>

      <Modal open={!!showRecords} onClose={() => setShowRecords(null)} title="Audit Records">
        {records.length === 0 ? (
          <p className="text-sm text-ink-500">No records submitted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-200 dark:border-ink-700">
                  <th className="pb-2 font-medium text-ink-500">Asset</th>
                  <th className="pb-2 font-medium text-ink-500">Result</th>
                  <th className="pb-2 font-medium text-ink-500">Auditor</th>
                  <th className="pb-2 font-medium text-ink-500">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                {records.map((rec: AuditRecord) => (
                  <tr key={rec.id}>
                    <td className="py-2 font-medium text-ink-900 dark:text-white">
                      {rec.asset?.name ?? rec.assetId}
                    </td>
                    <td className="py-2"><StatusBadge status={rec.result} /></td>
                    <td className="py-2 text-ink-600 dark:text-ink-400">
                      {rec.auditedBy?.name ?? '—'}
                    </td>
                    <td className="py-2 text-ink-600 dark:text-ink-400">
                      {rec.notes ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <Modal open={!!showSubmitRecord} onClose={() => setShowSubmitRecord(null)} title="Submit Audit Record">
        <form className="flex flex-col gap-4" onSubmit={handleSubmitRecord(onSubmitRecord)}>
          <Input label="Asset ID" placeholder="Enter asset ID" error={recordErrors.assetId?.message} {...registerRecord('assetId')} />
          <Select
            label="Result"
            options={[{ value: '', label: 'Select result' }, ...RESULT_OPTIONS]}
            error={recordErrors.result?.message}
            {...registerRecord('result')}
          />
          <Input label="Notes (optional)" placeholder="Any observations..." {...registerRecord('notes')} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" isLoading={submitRecordMutation.isPending}>Submit Record</Button>
        </form>
      </Modal>
    </div>
  );
}
