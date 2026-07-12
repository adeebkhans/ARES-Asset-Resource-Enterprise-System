import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ApiRequestError } from '@/types/api.types';
import { listCategories, createCategory, deleteCategory } from '@/features/asset-categories/api';
import type { AssetCategory } from '@/types/domain.types';

export function CategoriesTab() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [error, setError] = useState('');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['asset-categories'],
    queryFn: listCategories,
  });

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-categories'] });
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      setError('');
    },
    onError: (err) => {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to create category');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['asset-categories'] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Asset Categories</h3>
        <Button onClick={() => setShowCreate(true)}>Add Category</Button>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading...</p>}

      {!isLoading && categories.length === 0 && (
        <p className="text-sm text-slate-500">No categories yet. Create one to start registering assets.</p>
      )}

      {categories.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="pb-2 font-medium text-slate-500">Name</th>
                <th className="pb-2 font-medium text-slate-500">Description</th>
                <th className="pb-2 font-medium text-slate-500">Assets</th>
                <th className="pb-2 font-medium text-slate-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {categories.map((cat: AssetCategory) => (
                <tr key={cat.id}>
                  <td className="py-2 font-medium text-slate-900 dark:text-white">{cat.name}</td>
                  <td className="py-2 text-slate-600 dark:text-slate-400">{cat.description ?? '—'}</td>
                  <td className="py-2 text-slate-600 dark:text-slate-400">{cat._count?.assets ?? 0}</td>
                  <td className="py-2 text-right">
                    <Button
                      variant="secondary"
                      onClick={() => deleteMutation.mutate(cat.id)}
                      isLoading={deleteMutation.isPending}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Asset Category">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            createMutation.mutate({ name: newName.trim(), description: newDesc.trim() || undefined });
          }}
        >
          <Input
            label="Category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Electronics"
          />
          <Input
            label="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="e.g. Laptops, monitors, peripherals"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" isLoading={createMutation.isPending}>Create</Button>
        </form>
      </Modal>
    </div>
  );
}
