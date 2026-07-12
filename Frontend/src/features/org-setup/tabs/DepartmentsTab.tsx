import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/Badge';
import { ApiRequestError } from '@/types/api.types';
import { listDepartments, createDepartment, deleteDepartment } from '@/features/departments/api';
import type { Department } from '@/types/domain.types';

export function DepartmentsTab() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: listDepartments,
  });

  const createMutation = useMutation({
    mutationFn: createDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setShowCreate(false);
      setNewName('');
      setError('');
    },
    onError: (err) => {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to create department');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departments'] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Departments</h3>
        <Button onClick={() => setShowCreate(true)}>Add Department</Button>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading...</p>}

      {!isLoading && departments.length === 0 && (
        <p className="text-sm text-slate-500">No departments yet. Create one to get started.</p>
      )}

      {departments.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="pb-2 font-medium text-slate-500">Name</th>
                <th className="pb-2 font-medium text-slate-500">Head</th>
                <th className="pb-2 font-medium text-slate-500">Members</th>
                <th className="pb-2 font-medium text-slate-500">Status</th>
                <th className="pb-2 font-medium text-slate-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {departments.map((dept: Department) => (
                <tr key={dept.id}>
                  <td className="py-2 font-medium text-slate-900 dark:text-white">{dept.name}</td>
                  <td className="py-2 text-slate-600 dark:text-slate-400">
                    {dept.head?.name ?? '—'}
                  </td>
                  <td className="py-2 text-slate-600 dark:text-slate-400">
                    {dept._count?.members ?? 0}
                  </td>
                  <td className="py-2"><StatusBadge status={dept.status} /></td>
                  <td className="py-2 text-right">
                    <Button
                      variant="secondary"
                      onClick={() => deleteMutation.mutate(dept.id)}
                      isLoading={deleteMutation.isPending}
                    >
                      Deactivate
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Department">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            createMutation.mutate({ name: newName.trim() });
          }}
        >
          <Input
            label="Department name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Engineering"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" isLoading={createMutation.isPending}>Create</Button>
        </form>
      </Modal>
    </div>
  );
}
