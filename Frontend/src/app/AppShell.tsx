import { Outlet, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { logout as logoutRequest } from '@/features/auth/api';
import type { Role } from '@/types/auth.types';

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Admin',
  ASSET_MANAGER: 'Asset Manager',
  DEPARTMENT_HEAD: 'Department Head',
  EMPLOYEE: 'Employee',
};

const ROLE_BADGE_CLASS: Record<Role, string> = {
  ADMIN: 'bg-role-admin/10 text-role-admin',
  ASSET_MANAGER: 'bg-role-asset-manager/10 text-role-asset-manager',
  DEPARTMENT_HEAD: 'bg-role-department-head/10 text-role-department-head',
  EMPLOYEE: 'bg-role-employee/10 text-role-employee',
};

/**
 * Shell for every authenticated route. The role badge here is deliberately
 * visible everywhere — Phase 6 replaces the dashboard body with genuinely
 * different per-role layouts (plan.md §8.5); this shell is what stays constant.
 */
export function AppShell() {
  const navigate = useNavigate();
  const { user, refreshToken, clear } = useAuthStore();

  const handleLogout = async () => {
    if (refreshToken) {
      await logoutRequest(refreshToken).catch(() => undefined);
    }
    clear();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-slate-900 dark:text-white">ARES</span>
          {user && (
            <span
              className={clsx('rounded-full px-2.5 py-0.5 text-xs font-medium', ROLE_BADGE_CLASS[user.role])}
            >
              {ROLE_LABEL[user.role]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {user && <span className="text-sm text-slate-600 dark:text-slate-300">{user.name}</span>}
          <Button variant="secondary" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
