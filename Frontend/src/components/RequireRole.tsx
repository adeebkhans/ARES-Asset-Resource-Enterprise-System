import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import type { Role } from '@/types/auth.types';

interface RequireRoleProps {
  roles: Role[];
  redirectTo?: string;
}

/** Route guard for screens scoped to specific roles (e.g. Org Setup is Admin-only per plan.md). */
export function RequireRole({ roles, redirectTo = '/dashboard' }: RequireRoleProps) {
  const role = useAuthStore((s) => s.user?.role);

  if (!role || !roles.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
