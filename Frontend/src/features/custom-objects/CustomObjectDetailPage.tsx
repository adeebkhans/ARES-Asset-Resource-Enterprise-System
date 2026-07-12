import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { DynamicForm } from '@/components/dynamic-form/DynamicForm';
import { DynamicTable } from '@/components/dynamic-form/DynamicTable';
import { ApiRequestError } from '@/types/api.types';
import { useAuthStore } from '@/store/auth.store';
import type { CustomFieldDefinition, CustomObjectRecord } from '@/types/domain.types';
import {
  createFieldForObject,
  createRecord,
  deleteField,
  deleteRecord,
  getObjectDefinition,
  listFieldsForObject,
  listRecords,
  updateRecord,
} from './api';

const FIELD_TYPES: { value: CustomFieldDefinition['fieldType']; label: string }[] = [
  { value: 'TEXT', label: 'Text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'DATE', label: 'Date' },
  { value: 'BOOLEAN', label: 'Yes / No' },
  { value: 'SELECT', label: 'Select (one)' },
  { value: 'MULTISELECT', label: 'Select (multiple)' },
  { value: 'RELATION', label: 'Relation' },
];

const RELATION_TARGETS: { value: string; label: string }[] = [
  { value: 'ASSET', label: 'Asset' },
  { value: 'USER', label: 'Employee' },
  { value: 'DEPARTMENT', label: 'Department' },
];

const fieldSchema = z.object({
  fieldKey: z.string().trim().min(1).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'letters, numbers, underscores'),
  label: z.string().trim().min(1),
  fieldType: z.enum(['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTISELECT', 'RELATION']),
  optionsCsv: z.string().optional(),
  isRequired: z.boolean().optional(),
  relationTarget: z.string().optional(),
});
type FieldFormValues = z.infer<typeof fieldSchema>;

export function CustomObjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const objectId = id!;
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === 'ADMIN';

  const [showAddField, setShowAddField] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CustomObjectRecord | null>(null);
  const [error, setError] = useState('');

  const { data: definition } = useQuery({ queryKey: ['custom-objects', objectId], queryFn: () => getObjectDefinition(objectId) });
  const { data: fields = [], isLoading: fieldsLoading } = useQuery({
    queryKey: ['custom-objects', objectId, 'fields'],
    queryFn: () => listFieldsForObject(objectId),
  });
  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['custom-objects', objectId, 'records'],
    queryFn: () => listRecords(objectId),
  });

  const fieldForm = useForm<FieldFormValues>({ resolver: zodResolver(fieldSchema) });
  const watchType = fieldForm.watch('fieldType');

  const createFieldMutation = useMutation({
    mutationFn: (values: FieldFormValues) =>
      createFieldForObject(objectId, {
        fieldKey: values.fieldKey,
        label: values.label,
        fieldType: values.fieldType,
        options: values.optionsCsv ? values.optionsCsv.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        isRequired: values.isRequired,
        relationTarget: values.relationTarget as CustomFieldDefinition['relationTarget'],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-objects', objectId, 'fields'] });
      setShowAddField(false);
      fieldForm.reset();
      setError('');
    },
    onError: (err) => setError(err instanceof ApiRequestError ? err.message : 'Failed to add field'),
  });

  const deleteFieldMutation = useMutation({
    mutationFn: deleteField,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-objects', objectId, 'fields'] }),
  });

  const createRecordMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => createRecord(objectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-objects', objectId, 'records'] });
      queryClient.invalidateQueries({ queryKey: ['custom-objects'] });
      setShowAddRecord(false);
      setError('');
    },
    onError: (err) => setError(err instanceof ApiRequestError ? err.message : 'Failed to create record'),
  });

  const updateRecordMutation = useMutation({
    mutationFn: ({ recordId, data }: { recordId: string; data: Record<string, unknown> }) => updateRecord(recordId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-objects', objectId, 'records'] });
      setEditingRecord(null);
      setError('');
    },
    onError: (err) => setError(err instanceof ApiRequestError ? err.message : 'Failed to update record'),
  });

  const deleteRecordMutation = useMutation({
    mutationFn: deleteRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-objects', objectId, 'records'] });
      queryClient.invalidateQueries({ queryKey: ['custom-objects'] });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/custom-objects" className="text-sm text-brand-700 hover:underline dark:text-brand-400">
          ← Custom Objects
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-2xl">{definition?.icon || '🧩'}</span>
          <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-white">{definition?.pluralLabel ?? '…'}</h1>
        </div>
        {definition?.description && <p className="text-sm text-ink-500">{definition.description}</p>}
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Fields</h2>
          {isAdmin && (
            <Button variant="secondary" onClick={() => { setShowAddField(true); setError(''); fieldForm.reset(); }}>
              + Add Field
            </Button>
          )}
        </div>
        {fieldsLoading && <p className="text-sm text-ink-500">Loading…</p>}
        {!fieldsLoading && fields.length === 0 && (
          <p className="text-sm text-ink-500">No fields defined yet — add one to start capturing data.</p>
        )}
        {fields.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {[...fields]
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((f) => (
                <span
                  key={f.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-xs font-medium text-ink-700 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300"
                >
                  {f.label}
                  <span className="text-ink-400">·</span>
                  <span className="text-ink-400">{f.fieldType.toLowerCase()}</span>
                  {f.isRequired && <span className="text-brand-600 dark:text-brand-400">*</span>}
                  {isAdmin && (
                    <button
                      onClick={() => deleteFieldMutation.mutate(f.id)}
                      className="ml-1 text-ink-400 hover:text-red-600"
                      title="Remove field"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Records</h2>
          {fields.length > 0 && <Button onClick={() => { setShowAddRecord(true); setError(''); }}>+ Add Record</Button>}
        </div>

        {recordsLoading && <p className="text-sm text-ink-500">Loading…</p>}

        {!recordsLoading && fields.length === 0 && (
          <EmptyState icon="🏗️" title="Define fields first" description="Add at least one field above before creating records." />
        )}

        {!recordsLoading && fields.length > 0 && records.length === 0 && (
          <EmptyState
            icon="📋"
            title={`No ${definition?.pluralLabel.toLowerCase() ?? 'records'} yet`}
            description="Records you add will show up here, in a table generated straight from the fields you defined."
            action={<Button onClick={() => setShowAddRecord(true)}>Add the first one</Button>}
          />
        )}

        {records.length > 0 && (
          <DynamicTable
            fields={fields}
            records={records}
            onEdit={(r) => setEditingRecord(r)}
            onDelete={(r) => deleteRecordMutation.mutate(r.id)}
          />
        )}
      </Card>

      <Modal open={showAddField} onClose={() => setShowAddField(false)} title="Add Field">
        <form className="flex flex-col gap-4" onSubmit={fieldForm.handleSubmit((v) => createFieldMutation.mutate(v))}>
          <Input label="Field key" placeholder="e.g. admissionDate" error={fieldForm.formState.errors.fieldKey?.message} {...fieldForm.register('fieldKey')} />
          <Input label="Label" placeholder="e.g. Admission Date" error={fieldForm.formState.errors.label?.message} {...fieldForm.register('label')} />
          <Select label="Type" options={FIELD_TYPES} {...fieldForm.register('fieldType')} />
          {(watchType === 'SELECT' || watchType === 'MULTISELECT') && (
            <Input label="Options (comma-separated)" placeholder="e.g. Low, Medium, High" {...fieldForm.register('optionsCsv')} />
          )}
          {watchType === 'RELATION' && <Select label="Relates to" options={RELATION_TARGETS} {...fieldForm.register('relationTarget')} />}
          <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-300">
            <input type="checkbox" className="rounded" {...fieldForm.register('isRequired')} />
            Required
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" isLoading={createFieldMutation.isPending}>Add Field</Button>
        </form>
      </Modal>

      <Modal open={showAddRecord} onClose={() => setShowAddRecord(false)} title={`Add ${definition?.label ?? 'Record'}`}>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <DynamicForm fields={fields} onSubmit={(v) => createRecordMutation.mutate(v)} isSubmitting={createRecordMutation.isPending} submitLabel="Create" />
      </Modal>

      <Modal open={!!editingRecord} onClose={() => setEditingRecord(null)} title={`Edit ${definition?.label ?? 'Record'}`}>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {editingRecord && (
          <DynamicForm
            fields={fields}
            initialValues={editingRecord.data}
            onSubmit={(v) => updateRecordMutation.mutate({ recordId: editingRecord.id, data: v })}
            isSubmitting={updateRecordMutation.isPending}
            submitLabel="Save Changes"
          />
        )}
      </Modal>
    </div>
  );
}
