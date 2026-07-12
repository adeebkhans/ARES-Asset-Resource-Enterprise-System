import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { AppShell } from './AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/features/auth/LoginPage';
import { SignupPage } from '@/features/auth/SignupPage';
import { RegisterOrganizationPage } from '@/features/auth/RegisterOrganizationPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { OrgSetupPage } from '@/features/org-setup/OrgSetupPage';
import { AssetsPage } from '@/features/assets/AssetsPage';

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
              <Route path="/org-setup" element={<OrgSetupPage />} />
              <Route path="/assets" element={<AssetsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryProvider>
  );
}
