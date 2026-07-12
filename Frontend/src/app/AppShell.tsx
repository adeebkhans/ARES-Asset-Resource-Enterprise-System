import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAuthStore } from '@/store/auth.store';
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

const ROLE_DOT_CLASS: Record<Role, string> = {
  ADMIN: 'bg-role-admin',
  ASSET_MANAGER: 'bg-role-asset-manager',
  DEPARTMENT_HEAD: 'bg-role-department-head',
  EMPLOYEE: 'bg-role-employee',
};

interface NavItem {
  to: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

const NAV_SECTIONS: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: '📊' },
      { to: '/reports', label: 'Reports', icon: '📈', adminOnly: true },
      { to: '/activity-logs', label: 'Activity Log', icon: '📋', adminOnly: true },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { to: '/assets', label: 'Assets', icon: '📦' },
      { to: '/maintenance', label: 'Maintenance', icon: '🔧' },
      { to: '/audits', label: 'Audits', icon: '🔍' },
      { to: '/approvals', label: 'Approvals', icon: '✅' },
    ],
  },
  {
    heading: 'Configure',
    items: [
      { to: '/custom-objects', label: 'Custom Objects', icon: '🧩' },
      { to: '/org-setup', label: 'Org Setup', icon: '🏢', adminOnly: true },
    ],
  },
];

/**
 * Sidebar shell for every authenticated route. The role badge stays visible
 * everywhere — Phase 6 replaces the dashboard body with genuinely different
 * per-role layouts (plan.md §8.5); this shell is what stays constant.
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
    <div className="flex min-h-svh">
      <aside className="flex w-64 shrink-0 flex-col border-r border-ink-200/70 bg-white dark:border-ink-800 dark:bg-ink-900">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 font-display text-sm font-bold text-white">
            A
          </span>
          <span className="font-display text-lg font-semibold text-ink-900 dark:text-white">ARES</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {NAV_SECTIONS.map((section) => {
            const items = section.items.filter((item) => !item.adminOnly || user?.role === 'ADMIN');
            if (items.length === 0) return null;
            return (
              <div key={section.heading} className="mb-5">
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  {section.heading}
                </p>
                <div className="flex flex-col gap-0.5">
                  {items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-300'
                            : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-white',
                        )
                      }
                    >
                      <span className="text-base leading-none">{item.icon}</span>
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="mb-5">
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400">You</p>
            <NavLink
              to="/notifications"
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-300'
                    : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-white',
                )
              }
            >
              <span className="text-base leading-none">🔔</span>
              Notifications
            </NavLink>
          </div>
        </nav>

        {user && (
          <div className="border-t border-ink-200/70 p-3 dark:border-ink-800">
            <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
              <span className={clsx('h-2 w-2 shrink-0 rounded-full', ROLE_DOT_CLASS[user.role])} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900 dark:text-white">{user.name}</p>
                <span className={clsx('inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold', ROLE_BADGE_CLASS[user.role])}>
                  {ROLE_LABEL[user.role]}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Log out"
                className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-200"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto px-8 py-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
