import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAuthStore } from '@/store/auth.store';
import { logout as logoutRequest } from '@/features/auth/api';
import type { Role } from '@/types/auth.types';

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Admin',
  ASSET_MANAGER: 'Asset Manager',
  DEPARTMENT_HEAD: 'Dept Head',
  EMPLOYEE: 'Employee',
};

const ROLE_LED: Record<Role, string> = {
  ADMIN: 'led-red',
  ASSET_MANAGER: 'led-green',
  DEPARTMENT_HEAD: 'led-amber',
  EMPLOYEE: 'led-green',
};

interface NavItem {
  to: string;
  label: string;
  phosphor: string;
  adminOnly?: boolean;
}

const NAV_SECTIONS: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', phosphor: 'house' },
      { to: '/reports', label: 'Reports', phosphor: 'chart-bar', adminOnly: true },
      { to: '/activity-logs', label: 'Activity Log', phosphor: 'clock-counter-clockwise', adminOnly: true },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { to: '/assets', label: 'Assets', phosphor: 'package' },
      { to: '/maintenance', label: 'Maintenance', phosphor: 'wrench' },
      { to: '/audits', label: 'Audits', phosphor: 'magnifying-glass' },
      { to: '/approvals', label: 'Approvals', phosphor: 'check-circle' },
    ],
  },
  {
    heading: 'Configure',
    items: [
      { to: '/custom-objects', label: 'Custom Objects', phosphor: 'puzzle-piece' },
      { to: '/org-setup', label: 'Org Setup', phosphor: 'buildings', adminOnly: true },
    ],
  },
];

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
      <aside className="flex w-64 shrink-0 flex-col bg-chassis" style={{ boxShadow: '4px 0 12px rgba(0,0,0,0.08)' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-chassis" style={{ boxShadow: '6px 6px 12px #babecc, -6px -6px 12px #ffffff' }}>
            <i className="ph-bold ph-cpu" style={{ fontSize: 20, color: '#ff4757' }} />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-ink">ARES</span>
            <div className="flex items-center gap-1.5">
              <div className="led led-green animate-pulse" />
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-label">System Online</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {NAV_SECTIONS.map((section) => {
            const items = section.items.filter((item) => !item.adminOnly || user?.role === 'ADMIN');
            if (items.length === 0) return null;
            return (
              <div key={section.heading} className="mb-5">
                <p className="mb-1.5 px-3 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-label">
                  {section.heading}
                </p>
                <div className="flex flex-col gap-0.5">
                  {items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-mono text-xs font-medium uppercase tracking-wider transition-all duration-150',
                          isActive
                            ? 'bg-chassis text-ink'
                            : 'text-label hover:text-ink',
                          isActive && 'shadow-[inset_3px_3px_6px_#babecc,inset_-3px_-3px_6px_#ffffff]',
                          !isActive && 'hover:shadow-[inset_2px_2px_4px_#babecc,inset_-2px_-2px_4px_#ffffff]',
                        )
                      }
                    >
                      <i className={`ph-bold ${item.phosphor}`} style={{ fontSize: 16 }} />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="mb-5">
            <p className="mb-1.5 px-3 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-label">You</p>
            <NavLink
              to="/notifications"
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-mono text-xs font-medium uppercase tracking-wider transition-all duration-150',
                  isActive
                    ? 'bg-chassis text-ink shadow-[inset_3px_3px_6px_#babecc,inset_-3px_-3px_6px_#ffffff]'
                    : 'text-label hover:text-ink hover:shadow-[inset_2px_2px_4px_#babecc,inset_-2px_-2px_4px_#ffffff]',
                )
              }
            >
              <i className="ph-bold bell" style={{ fontSize: 16 }} />
              Notifications
            </NavLink>
          </div>
        </nav>

        {/* User footer */}
        {user && (
          <div className="border-t border-ink-200/50 p-3">
            <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
              <div className={clsx('led', ROLE_LED[user.role])} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs font-bold text-ink">{user.name}</p>
                <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-label">
                  {ROLE_LABEL[user.role]}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Log out"
                className="btn-physical rounded-lg bg-chassis p-1.5 text-label hover:text-accent"
              >
                <i className="ph-bold ph-sign-out" style={{ fontSize: 16 }} />
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
