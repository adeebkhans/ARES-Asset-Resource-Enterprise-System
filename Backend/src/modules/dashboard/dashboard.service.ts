import { DashboardRepository, DashboardKpis, DashboardRole } from './dashboard.repository';

export class DashboardService {
  constructor(private readonly repo: DashboardRepository = new DashboardRepository()) {}

  async getKpis(orgId: string, userId: string, role: DashboardRole, departmentId?: string | null): Promise<DashboardKpis> {
    switch (role) {
      case 'ADMIN':
        return this.repo.getAdminKpis(orgId, userId);
      case 'ASSET_MANAGER':
        return this.repo.getAssetManagerKpis(orgId, userId);
      case 'DEPARTMENT_HEAD':
        return this.repo.getDepartmentHeadKpis(orgId, userId, departmentId ?? null);
      case 'EMPLOYEE':
        return this.repo.getEmployeeKpis(orgId, userId);
      default:
        return this.repo.getAdminKpis(orgId, userId);
    }
  }
}
