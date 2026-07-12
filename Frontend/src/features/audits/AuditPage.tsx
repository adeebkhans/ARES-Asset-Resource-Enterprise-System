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
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Audits</h1>
        <p className="text-sm text-slate-500">Plan audit cycles, assign auditors, and track discrepancies.</p>
      </div>

      {statusCounts && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
          {Object.entries(statusCounts as Record<string, number>).map(([status, count]) => (
            <Card key={status} className="flex flex-col items-center gap-1 py-3">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{count}</span>
              <span className="text-xs text-slate-500">{status.replace(/_/g, ' ')}</span>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <Input
          label=""
          placeholder="Search cycles..."
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
        <Button onClick={() => { setShowCreate(true); setError(''); resetCreate(); }}>
          Create Cycle
        </Button>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading...</p>}

      {!isLoading && cycles.length === 0 && (
        <p className="text-sm text-slate-500">No audit cycles found.</p>
      )}

      {cycles.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="pb-2 font-medium text-slate-500">Department</th>
                <th className="pb-2 font-medium text-slate-500">Location</th>
                <th className="pb-2 font-medium text-slate-500">Dates</th>
                <th className="pb-2 font-medium text-slate-500">Auditors</th>
                <th className="pb-2 font-medium text-slate-500">Status</th>
                <th className="pb-2 font-medium text-slate-500">Records</th>
                <th className="pb-2 font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {cycles.map((cycle: AuditCycle) => (
                <tr key={cycle.id}>
                  <td className="py-2 text-slate-600 dark:text-slate-400">
                    {cycle.scopeDepartment?.name ?? 'All'}
                  </td>
                  <td className="py-2 text-slate-600 dark:text-slate-400">
                    {cycle.scopeLocation ?? '—'}
                  </td>
                  <td className="py-2 text-slate-600 dark:text-slate-400">
                    {new Date(cycle.startDate).toLocaleDateString()} – {new Date(cycle.endDate).toLocaleDateString()}
                  </td>
                  <td className="py-2 text-slate-600 dark:text-slate-400">
                    {cycle.assignments?.map((a) => a.auditor.name).join(', ') ?? '—'}
                  </td>
                  <td className="py-2"><StatusBadge status={cycle.status} /></td>
                  <td className="py-2 text-slate-600 dark:text-slate-400">
                    {cycle._count?.records ?? 0}
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      {cycle.status === 'PLANNED' && (
                        <button
                          className="text-xs text-green-600 hover:underline"
                          onClick={() => startCycleMutation.mutate(cycle.id)}
                        >
                          Start
                        </button>
                      )}
                      {cycle.status === 'IN_PROGRESS' && (
                        <>
                          <button
                            className="text-xs text-blue-600 hover:underline"
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
                            className="text-xs text-red-600 hover:underline"
                            onClick={() => closeCycleMutation.mutate(cycle.id)}
                          >
                            Close Cycle
                          </button>
                        </>
                      )}
                      <button
                        className="text-xs text-slate-500 hover:underline"
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
          <p className="text-sm text-slate-500">No records submitted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="pb-2 font-medium text-slate-500">Asset</th>
                  <th className="pb-2 font-medium text-slate-500">Result</th>
                  <th className="pb-2 font-medium text-slate-500">Auditor</th>
                  <th className="pb-2 font-medium text-slate-500">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {records.map((rec: AuditRecord) => (
                  <tr key={rec.id}>
                    <td className="py-2 font-medium text-slate-900 dark:text-white">
                      {rec.asset?.name ?? rec.assetId}
                    </td>
                    <td className="py-2"><StatusBadge status={rec.result} /></td>
                    <td className="py-2 text-slate-600 dark:text-slate-400">
                      {rec.auditedBy?.name ?? '—'}
                    </td>
                    <td className="py-2 text-slate-600 dark:text-slate-400">
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
