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
import { searchAssets, createAsset, getAssetStatusCounts } from '@/features/assets/api';
import { listCategories } from '@/features/asset-categories/api';
import type { Asset, AssetStatus, AssetCategory } from '@/types/domain.types';

const createAssetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  categoryId: z.string().min(1, 'Category is required'),
  serialNumber: z.string().optional(),
  condition: z.string().optional(),
  location: z.string().optional(),
  isShared: z.boolean().optional(),
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

export function AssetsPage() {
  const queryClient = useQueryClient();
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: formErrors },
  } = useForm<CreateAssetForm>({ resolver: zodResolver(createAssetSchema) });

  const onSubmit = (data: CreateAssetForm) => {
    createMutation.mutate({
      name: data.name,
      categoryId: data.categoryId,
      serialNumber: data.serialNumber || undefined,
      condition: data.condition || undefined,
      location: data.location || undefined,
      isShared: data.isShared ?? false,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Assets</h1>
        <p className="text-sm text-slate-500">Register, search, and manage your organization's assets.</p>
      </div>

      {statusCounts && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
          placeholder="Search by name, tag, or serial..."
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
        <Button onClick={() => { setShowCreate(true); setError(''); reset(); }}>Register Asset</Button>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading...</p>}

      {!isLoading && assets.length === 0 && (
        <p className="text-sm text-slate-500">No assets found. Register one to get started.</p>
      )}

      {assets.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="pb-2 font-medium text-slate-500">Tag</th>
                <th className="pb-2 font-medium text-slate-500">Name</th>
                <th className="pb-2 font-medium text-slate-500">Category</th>
                <th className="pb-2 font-medium text-slate-500">Location</th>
                <th className="pb-2 font-medium text-slate-500">Status</th>
                <th className="pb-2 font-medium text-slate-500">Shared</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {assets.map((asset: Asset) => (
                <tr key={asset.id}>
                  <td className="py-2 font-mono text-xs text-slate-600 dark:text-slate-400">{asset.assetTag}</td>
                  <td className="py-2 font-medium text-slate-900 dark:text-white">{asset.name}</td>
                  <td className="py-2 text-slate-600 dark:text-slate-400">{asset.category?.name ?? '—'}</td>
                  <td className="py-2 text-slate-600 dark:text-slate-400">{asset.location ?? '—'}</td>
                  <td className="py-2"><StatusBadge status={asset.status} /></td>
                  <td className="py-2 text-slate-600 dark:text-slate-400">{asset.isShared ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Register New Asset">
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
            <label htmlFor="isShared" className="text-sm text-slate-700 dark:text-slate-300">
              Bookable (shared resource)
            </label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" isLoading={createMutation.isPending}>Register Asset</Button>
        </form>
      </Modal>
    </div>
  );
}
