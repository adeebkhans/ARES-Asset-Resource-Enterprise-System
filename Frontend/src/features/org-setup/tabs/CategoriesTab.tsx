import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiRequestError } from '@/types/api.types';
import { listCategories, createCategory, updateCategory, deleteCategory } from '@/features/asset-categories/api';
import { useAuthStore } from '@/store/auth.store';
import type { AssetCategory } from '@/types/domain.types';

export function CategoriesTab() {
  const queryClient = useQueryClient();
  // Only Admin can delete a category — DELETE /asset-categories/:id is Admin-only server-side.
  const isAdmin = useAuthStore((s) => s.user?.role) === 'ADMIN';
  const [showCreate, setShowCreate] = useState(false);
  const [editCat, setEditCat] = useState<AssetCategory | null>(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
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

  const updateMutation = useMutation({
    mutationFn: ({ id, name, description }: { id: string; name?: string; description?: string | null }) =>
      updateCategory(id, { name, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-categories'] });
      setEditCat(null);
      setEditName('');
      setEditDesc('');
      setError('');
    },
    onError: (err) => {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to update category');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['asset-categories'] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Asset Categories</h3>
        <Button onClick={() => setShowCreate(true)}>Add Category</Button>
      </div>

      {isLoading && <p className="text-sm text-ink-500">Loading...</p>}

      {!isLoading && categories.length === 0 && (
        <EmptyState icon="tag" title="No categories yet" description="Create a category to start registering assets under it." action={<Button onClick={() => setShowCreate(true)}>Add Category</Button>} />
      )}

      {categories.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-200 dark:border-ink-700">
                <th className="pb-2 font-medium text-ink-500">Name</th>
                <th className="pb-2 font-medium text-ink-500">Description</th>
                <th className="pb-2 font-medium text-ink-500">Assets</th>
                <th className="pb-2 font-medium text-ink-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {categories.map((cat: AssetCategory) => (
                <tr key={cat.id}>
                  <td className="py-2 font-medium text-ink-900 text-black">{cat.name}</td>
                  <td className="py-2 text-ink-600 dark:text-ink-400">{cat.description ?? '—'}</td>
                  <td className="py-2 text-ink-600 dark:text-ink-400">{cat._count?.assets ?? 0}</td>
                  <td className="py-2 text-right">
                    <div className="flex gap-1">
                      <Button
                        variant="secondary"
                        onClick={() => { setEditCat(cat); setEditName(cat.name); setEditDesc(cat.description ?? ''); setError(''); }}
                      >
                        Edit
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="secondary"
                          onClick={() => deleteMutation.mutate(cat.id)}
                          isLoading={deleteMutation.isPending}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
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
          <Input label="Category name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Electronics" />
          <Input label="Description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="e.g. Laptops, monitors, peripherals" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" isLoading={createMutation.isPending}>Create</Button>
        </form>
      </Modal>

      <Modal open={!!editCat} onClose={() => setEditCat(null)} title={`Edit Category — ${editCat?.name}`}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!editCat) return;
            updateMutation.mutate({
              id: editCat.id,
              name: editName.trim() || undefined,
              description: editDesc.trim() || null,
            });
          }}
        >
          <Input label="Category name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <Input label="Description" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" isLoading={updateMutation.isPending}>Save Changes</Button>
        </form>
      </Modal>
    </div>
  );
}
