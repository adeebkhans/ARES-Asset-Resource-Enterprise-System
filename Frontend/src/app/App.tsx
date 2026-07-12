import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { AppShell } from './AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RequireRole } from '@/components/RequireRole';
import { LoginPage } from '@/features/auth/LoginPage';
import { SignupPage } from '@/features/auth/SignupPage';
import { RegisterOrganizationPage } from '@/features/auth/RegisterOrganizationPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { OrgSetupPage } from '@/features/org-setup/OrgSetupPage';
import { AssetsPage } from '@/features/assets/AssetsPage';
import { MaintenancePage } from '@/features/maintenance/MaintenancePage';
import { AuditPage } from '@/features/audits/AuditPage';
import { NotificationsPage } from '@/features/notifications/NotificationsPage';

export function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/register-organization" element={<RegisterOrganizationPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/assets" element={<AssetsPage />} />
              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route path="/audits" element={<AuditPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              {/* Organization Setup is Admin-only per the brief — Departments/Categories/Employee Directory. */}
              <Route element={<RequireRole roles={['ADMIN']} />}>
                <Route path="/org-setup" element={<OrgSetupPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryProvider>
  );
}
