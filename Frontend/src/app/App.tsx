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
import { ApprovalPage } from '@/features/approvals/ApprovalPage';
import { CustomObjectsPage } from '@/features/custom-objects/CustomObjectsPage';
import { CustomObjectDetailPage } from '@/features/custom-objects/CustomObjectDetailPage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { ActivityLogsPage } from '@/features/activity-logs/ActivityLogsPage';

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
              <Route path="/approvals" element={<ApprovalPage />} />
              <Route path="/custom-objects" element={<CustomObjectsPage />} />
              <Route path="/custom-objects/:id" element={<CustomObjectDetailPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/activity-logs" element={<ActivityLogsPage />} />
              {/* Departments/Employee Directory/Templates are Admin-only per the brief; Asset Manager
                  also gets in because they hold backend permission to manage Asset Categories
                  (OrgSetupPage itself hides the other tabs for non-admins). */}
              <Route element={<RequireRole roles={['ADMIN', 'ASSET_MANAGER']} />}>
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
