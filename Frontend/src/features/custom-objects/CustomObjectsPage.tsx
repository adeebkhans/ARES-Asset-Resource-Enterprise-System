import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiRequestError } from '@/types/api.types';
import { createObjectDefinition, listObjectDefinitions } from './api';

const schema = z.object({
  key: z.string().trim().min(1).regex(/^[a-z][a-z0-9_]*$/, 'lowercase letters, numbers, underscores'),
  label: z.string().trim().min(1),
  pluralLabel: z.string().trim().min(1),
  icon: z.string().trim().max(8).optional(),
  description: z.string().trim().optional(),
});
type FormValues = z.infer<typeof schema>;

/**
 * The visible surface of the Configurable Object Framework (plan.md §7): the
 * fixed brief modules (Assets, Employees, ...) live elsewhere — this page is
 * where an org defines entities *specific to their business* (Patient, Guest,
 * Classroom, ...) without any code change.
 */
export function CustomObjectsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');

  const { data: objects = [], isLoading } = useQuery({ queryKey: ['custom-objects'], queryFn: listObjectDefinitions });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: formErrors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const createMutation = useMutation({
    mutationFn: createObjectDefinition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-objects'] });
      setShowCreate(false);
      reset();
      setError('');
    },
    onError: (err) => setError(err instanceof ApiRequestError ? err.message : 'Failed to create object type'),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-white">Custom Objects</h1>
          <p className="text-sm text-ink-500">
            Define entities specific to your business — Patients, Guests, Classrooms — with their own fields, forms, and lists.
          </p>
        </div>
        <Button onClick={() => { setShowCreate(true); setError(''); reset(); }}>+ New Object Type</Button>
      </div>

      {isLoading && <p className="text-sm text-ink-500">Loading…</p>}

      {!isLoading && objects.length === 0 && (
        <EmptyState
          icon="puzzle-piece"
          title="No custom objects yet"
          description="Model something your organization tracks that isn't an Asset — a Patient, a Guest, a Classroom — and it gets a form and a list for free."
          action={<Button onClick={() => setShowCreate(true)}>Create your first object type</Button>}
        />
      )}

      {objects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {objects.map((obj) => (
            <Link key={obj.id} to={`/custom-objects/${obj.id}`}>
              <Card className="flex h-full flex-col gap-2 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-2">
                   <span className="text-2xl">{obj.icon || <i className="ph-bold ph-puzzle-piece" />}</span>
                  <span className="font-display font-semibold text-ink-900 dark:text-white">{obj.pluralLabel}</span>
                </div>
                {obj.description && <p className="text-sm text-ink-500">{obj.description}</p>}
                <div className="mt-auto pt-2 text-xs font-medium text-brand-600 dark:text-brand-400">
                  {obj._count?.records ?? 0} record{obj._count?.records === 1 ? '' : 's'}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Object Type">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((v) => createMutation.mutate(v))}>
          <Input label="Machine key" placeholder="e.g. patient" error={formErrors.key?.message} {...register('key')} />
          <Input label="Label (singular)" placeholder="e.g. Patient" error={formErrors.label?.message} {...register('label')} />
          <Input label="Label (plural)" placeholder="e.g. Patients" error={formErrors.pluralLabel?.message} {...register('pluralLabel')} />
           <Input label="Icon (optional)" placeholder="e.g. stethoscope" {...register('icon')} />
          <Input label="Description (optional)" {...register('description')} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" isLoading={createMutation.isPending}>Create</Button>
        </form>
      </Modal>
    </div>
  );
}
