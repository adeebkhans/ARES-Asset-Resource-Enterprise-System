import { NavLink, Outlet, useNavigate } from 'react-router-dom';
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

const NAV_LINKS: { to: string; label: string; adminOnly?: boolean }[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/org-setup', label: 'Org Setup', adminOnly: true },
  { to: '/assets', label: 'Assets' },
];

export function AppShell() {
  const navigate = useNavigate();
  const { user, refreshToken, clear } = useAuthStore();
  const visibleLinks = NAV_LINKS.filter((link) => !link.adminOnly || user?.role === 'ADMIN');

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
        <div className="flex items-center gap-6">
          <span className="text-lg font-semibold text-slate-900 dark:text-white">ARES</span>
          <nav className="flex items-center gap-1">
            {visibleLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  clsx(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <span
              className={clsx('rounded-full px-2.5 py-0.5 text-xs font-medium', ROLE_BADGE_CLASS[user.role])}
            >
              {ROLE_LABEL[user.role]}
            </span>
          )}
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
