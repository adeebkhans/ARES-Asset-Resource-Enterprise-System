import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/Badge';
import { ApiRequestError } from '@/types/api.types';
import { listEmployees, updateEmployeeRole } from '@/features/employees/api';
import { useAuthStore } from '@/store/auth.store';
import type { Employee, Role } from '@/types/domain.types';

const ROLE_OPTIONS = [
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'DEPARTMENT_HEAD', label: 'Department Head' },
  { value: 'ASSET_MANAGER', label: 'Asset Manager' },
  { value: 'ADMIN', label: 'Admin' },
];

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Admin',
  ASSET_MANAGER: 'Asset Manager',
  DEPARTMENT_HEAD: 'Department Head',
  EMPLOYEE: 'Employee',
};

export function EmployeesTab() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [search, setSearch] = useState('');
  const [promoteUser, setPromoteUser] = useState<Employee | null>(null);
  const [newRole, setNewRole] = useState<Role>('EMPLOYEE');
  const [error, setError] = useState('');

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees', search],
    queryFn: () => listEmployees(search || undefined),
  });

  const promoteMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => updateEmployeeRole(id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setPromoteUser(null);
      setError('');
    },
    onError: (err) => {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to update role');
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Employee Directory</h3>
        <Input
          label=""
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
      </div>

      {isLoading && <p className="text-sm text-ink-500">Loading...</p>}

      {!isLoading && employees.length === 0 && (
        <p className="text-sm text-ink-500">
          {search ? 'No employees match your search.' : 'No employees yet.'}
        </p>
      )}

      {employees.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-200 dark:border-ink-700">
                <th className="pb-2 font-medium text-ink-500">Name</th>
                <th className="pb-2 font-medium text-ink-500">Email</th>
                <th className="pb-2 font-medium text-ink-500">Role</th>
                <th className="pb-2 font-medium text-ink-500">Department</th>
                <th className="pb-2 font-medium text-ink-500">Status</th>
                <th className="pb-2 font-medium text-ink-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {employees.map((emp: Employee) => (
                <tr key={emp.id}>
                  <td className="py-2 font-medium text-ink-900 dark:text-white">{emp.name}</td>
                  <td className="py-2 text-ink-600 dark:text-ink-400">{emp.email}</td>
                  <td className="py-2 text-ink-600 dark:text-ink-400">{ROLE_LABEL[emp.role]}</td>
                  <td className="py-2 text-ink-600 dark:text-ink-400">{emp.department?.name ?? '—'}</td>
                  <td className="py-2"><StatusBadge status={emp.status} /></td>
                  <td className="py-2 text-right">
                    {emp.id === currentUserId ? (
                      <span className="text-xs text-ink-400">You can't change your own role</span>
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={() => { setPromoteUser(emp); setNewRole(emp.role); setError(''); }}
                      >
                        Change Role
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!promoteUser} onClose={() => setPromoteUser(null)} title={`Change Role — ${promoteUser?.name}`}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!promoteUser) return;
            promoteMutation.mutate({ id: promoteUser.id, role: newRole });
          }}
        >
          <Select
            label="Role"
            options={ROLE_OPTIONS}
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as Role)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" isLoading={promoteMutation.isPending}>Update Role</Button>
        </form>
      </Modal>
    </div>
  );
}
