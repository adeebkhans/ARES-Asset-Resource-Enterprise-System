import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { DynamicFieldInput } from '@/components/dynamic-form/DynamicForm';
import { ApiRequestError } from '@/types/api.types';
import { searchAssets, createAsset, getAssetStatusCounts, transitionAssetStatus } from '@/features/assets/api';
import { listCategories } from '@/features/asset-categories/api';
import { listCategoryFields } from '@/features/custom-objects/api';
import { useAuthStore } from '@/store/auth.store';
import type { Asset, AssetStatus, AssetCategory } from '@/types/domain.types';

const createAssetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  categoryId: z.string().min(1, 'Category is required'),
  serialNumber: z.string().optional(),
  condition: z.string().optional(),
  location: z.string().optional(),
  isShared: z.boolean().optional(),
  // Category-specific fields (plan.md §7.1) are rendered dynamically below and
  // authoritatively validated server-side — pass the raw object through here
  // rather than modeling every org's category schema in a static client schema.
  customFieldValues: z.record(z.string(), z.unknown()).optional(),
});

type CreateAssetForm = z.infer<typeof createAssetSchema>;

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'ALLOCATED', label: 'Allocated' },
  { value: 'RESERVED', label: 'Reserved' },
  { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance' },
  { value: 'LOST', label: 'Lost' },
  { value: 'RETIRED', label: 'Retired' },
];

const STATUS_TONE: Record<string, string> = {
  AVAILABLE: 'bg-emerald-500',
  ALLOCATED: 'bg-sky-500',
  RESERVED: 'bg-sky-400',
  UNDER_MAINTENANCE: 'bg-amber-500',
  LOST: 'bg-red-500',
  RETIRED: 'bg-ink-400',
  DISPOSED: 'bg-ink-400',
};

const VALID_TRANSITIONS: Record<string, { event: string; label: string }[]> = {
  AVAILABLE: [
    { event: 'allocate', label: 'Allocate' },
    { event: 'reserve', label: 'Reserve' },
    { event: 'retire', label: 'Retire' },
  ],
  ALLOCATED: [
    { event: 'return', label: 'Return' },
    { event: 'retire', label: 'Retire' },
  ],
  RESERVED: [
    { event: 'confirm_reservation', label: 'Confirm' },
    { event: 'retire', label: 'Retire' },
  ],
  UNDER_MAINTENANCE: [
    { event: 'resolve_maintenance', label: 'Resolve' },
    { event: 'retire', label: 'Retire' },
  ],
  LOST: [
    { event: 'recover', label: 'Recover' },
    { event: 'retire', label: 'Retire' },
  ],
  RETIRED: [
    { event: 'dispose', label: 'Dispose' },
  ],
};

export function AssetsPage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  // Mirrors the backend's role gates: POST /assets and PATCH transitions are
  // ADMIN/ASSET_MANAGER(/DEPARTMENT_HEAD for transitions) only — showing these
  // controls to roles that would just get a 403 is its own kind of bug.
  const canRegister = role === 'ADMIN' || role === 'ASSET_MANAGER';
  const canTransition = role === 'ADMIN' || role === 'ASSET_MANAGER' || role === 'DEPARTMENT_HEAD';

  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [error, setError] = useState('');

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets', search, statusFilter, categoryFilter],
    queryFn: () => searchAssets({
      search: search || undefined,
      status: (statusFilter as AssetStatus) || undefined,
      categoryId: categoryFilter || undefined,
    }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['asset-categories'],
    queryFn: listCategories,
  });

  const { data: statusCounts } = useQuery({
    queryKey: ['asset-status-counts'],
    queryFn: getAssetStatusCounts,
  });

  const categoryOptions = (categories as AssetCategory[]).map((c) => ({ value: c.id, label: c.name }));
  const hasNoCategories = categoryOptions.length === 0;

  const createMutation = useMutation({
    mutationFn: createAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-status-counts'] });
      setShowCreate(false);
      setError('');
    },
    onError: (err) => {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to create asset');
    },
  });

  const transitionMutation = useMutation({
    mutationFn: ({ id, event }: { id: string; event: string }) => transitionAssetStatus(id, event),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-status-counts'] });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors: formErrors },
  } = useForm<CreateAssetForm>({ resolver: zodResolver(createAssetSchema) });

  const selectedCategoryId = watch('categoryId');
  const { data: categoryFields = [] } = useQuery({
    queryKey: ['asset-categories', selectedCategoryId, 'fields'],
    queryFn: () => listCategoryFields(selectedCategoryId),
    enabled: !!selectedCategoryId,
  });

  const onSubmit = (data: CreateAssetForm) => {
    createMutation.mutate({
      name: data.name,
      categoryId: data.categoryId,
      serialNumber: data.serialNumber || undefined,
      condition: data.condition || undefined,
      location: data.location || undefined,
      isShared: data.isShared ?? false,
      customFieldValues: data.customFieldValues ?? {},
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 text-black">Assets</h1>
          <p className="text-sm text-ink-500">Register, search, and manage your organization's assets.</p>
        </div>
        {canRegister && (
          <Button onClick={() => { setShowCreate(true); setError(''); reset(); }}>+ Register Asset</Button>
        )}
      </div>

      {statusCounts && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(statusCounts as Record<string, number>).map(([status, count]) => (
            <Card key={status} className="relative overflow-hidden py-4">
              <span className={`absolute inset-x-0 top-0 h-1 ${STATUS_TONE[status] ?? 'bg-ink-300'}`} />
              <span className="block text-2xl font-bold text-ink-900 text-black">{count}</span>
              <span className="text-xs font-medium text-ink-500">{status.replace(/_/g, ' ')}</span>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <Input
          label=""
          placeholder="Search by name, tag, or serial…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select
          label=""
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-48"
        />
        <Select
          label=""
          options={[{ value: '', label: 'All categories' }, ...categoryOptions]}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-48"
        />
      </div>

      {isLoading && <p className="text-sm text-ink-500">Loading…</p>}

      {!isLoading && assets.length === 0 && (
        <EmptyState
          icon="package"
          title="No assets found"
          description={search || statusFilter || categoryFilter ? 'Try clearing your filters.' : 'Register your first asset to start tracking it through its lifecycle.'}
          action={canRegister && !search && !statusFilter && !categoryFilter ? <Button onClick={() => setShowCreate(true)}>Register Asset</Button> : undefined}
        />
      )}

      {assets.length > 0 && (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-200 dark:border-ink-700">
                  <th className="px-5 py-3 font-medium text-ink-500">Tag</th>
                  <th className="px-5 py-3 font-medium text-ink-500">Name</th>
                  <th className="px-5 py-3 font-medium text-ink-500">Category</th>
                  <th className="px-5 py-3 font-medium text-ink-500">Location</th>
                  <th className="px-5 py-3 font-medium text-ink-500">Status</th>
                  <th className="px-5 py-3 font-medium text-ink-500">Shared</th>
                  {canTransition && <th className="px-5 py-3 font-medium text-ink-500">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                {assets.map((asset: Asset) => (
                  <tr key={asset.id} className="transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                    <td className="px-5 py-2.5 font-mono text-xs text-brand-700 dark:text-brand-400">{asset.assetTag}</td>
                    <td className="px-5 py-2.5 font-medium text-ink-900 text-black">{asset.name}</td>
                    <td className="px-5 py-2.5 text-ink-600 dark:text-ink-400">{asset.category?.name ?? '—'}</td>
                    <td className="px-5 py-2.5 text-ink-600 dark:text-ink-400">{asset.location ?? '—'}</td>
                    <td className="px-5 py-2.5"><StatusBadge status={asset.status} /></td>
                    <td className="px-5 py-2.5 text-ink-600 dark:text-ink-400">{asset.isShared ? 'Yes' : 'No'}</td>
                    {canTransition && (
                      <td className="px-5 py-2.5">
                        <div className="flex gap-1">
                          {(VALID_TRANSITIONS[asset.status] ?? []).map((t) => (
                            <button
                              key={t.event}
                              onClick={() => transitionMutation.mutate({ id: asset.id, event: t.event })}
                              className="rounded bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-700 transition-colors hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Register New Asset">
        {hasNoCategories ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <i className="ph-bold ph-tag text-3xl text-ink-400" />
            <p className="text-sm font-medium text-ink-900 dark:text-white">You need an Asset Category first</p>
            <p className="text-sm text-ink-500">
              Assets are always registered under a category (e.g. "Electronics", "Vehicles"). Create one before registering your first asset.
            </p>
            <Link to="/org-setup?tab=categories" onClick={() => setShowCreate(false)}>
              <Button>Go to Asset Categories</Button>
            </Link>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <Input label="Asset Name" error={formErrors.name?.message} {...register('name')} />
            <Select
              label="Category"
              options={categoryOptions}
              placeholder="Select a category"
              error={formErrors.categoryId?.message}
              {...register('categoryId')}
            />
            <Input label="Serial Number (optional)" {...register('serialNumber')} />
            <Input label="Condition (optional)" placeholder="e.g. New, Good, Fair" {...register('condition')} />
            <Input label="Location (optional)" placeholder="e.g. Building A, Room 302" {...register('location')} />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isShared" className="rounded" {...register('isShared')} />
              <label htmlFor="isShared" className="text-sm text-ink-700 dark:text-ink-300">
                Bookable (shared resource)
              </label>
            </div>

            {selectedCategoryId && categoryFields.length > 0 && (
              <div className="flex flex-col gap-4 rounded-xl border border-dashed border-brand-300 bg-brand-50/40 p-4 dark:border-brand-800 dark:bg-brand-900/10">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
                  {categoryOptions.find((c) => c.value === selectedCategoryId)?.label} fields
                </p>
                {categoryFields.map((def) => (
                  <DynamicFieldInput
                    key={def.id}
                    def={def}
                    name={`customFieldValues.${def.fieldKey}`}
                    register={register}
                    control={control}
                  />
                ))}
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" isLoading={createMutation.isPending}>Register Asset</Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
