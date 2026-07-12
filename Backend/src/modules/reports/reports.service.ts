import { ReportsRepository, ReportSummary } from './reports.repository';

export class ReportsService {
  constructor(private readonly repo: ReportsRepository = new ReportsRepository()) {}

  async getFullReport(orgId: string): Promise<ReportSummary> {
    return this.repo.getFullReport(orgId);
  }

  async getAssetUtilization(orgId: string) {
    return this.repo.getAssetUtilization(orgId);
  }

  async getMaintenanceReport(orgId: string) {
    return this.repo.getMaintenanceReport(orgId);
  }

  async getRetirementForecast(orgId: string) {
    return this.repo.getRetirementForecast(orgId);
  }

  async getAuditSummary(orgId: string) {
    return this.repo.getAuditSummary(orgId);
  }
}
