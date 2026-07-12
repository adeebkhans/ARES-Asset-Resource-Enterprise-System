import { apiRequest } from '@/lib/api-client';

export interface AssetUtilizationReport {
  totalAssets: number;
  byStatus: Record<string, number>;
  byCategory: {
    categoryId: string;
    categoryName: string;
    count: number;
    available: number;
    allocated: number;
  }[];
  utilizationRate: number;
}

export interface MaintenanceReport {
  totalRequests: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  averageResolutionDays: number | null;
  resolvedThisMonth: number;
  resolvedLastMonth: number;
  trend: 'up' | 'down' | 'flat';
}

export interface RetirementForecast {
  assetId: string;
  assetTag: string;
  name: string;
  category: string;
  acquisitionDate: string | null;
  ageMonths: number;
  status: string;
}

export interface ReportSummary {
  assetUtilization: AssetUtilizationReport;
  maintenance: MaintenanceReport;
  retirementForecast: RetirementForecast[];
  auditSummary: {
    totalCycles: number;
    completedCycles: number;
    totalDiscrepancies: number;
  };
}

export interface DashboardKpis {
  role: string;
  assets: {
    total: number;
    available: number;
    allocated: number;
    underMaintenance: number;
    lost: number;
    retired: number;
  };
  maintenance: {
    pending: number;
    inProgress: number;
    resolvedThisMonth: number;
  };
  approvals: {
    pending: number;
    overdue: number;
  };
  notifications: {
    unread: number;
  };
  recentActivity: {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    timestamp: string;
    user?: { id: string; name: string } | null;
  }[];
}

export function getFullReport() {
  return apiRequest<ReportSummary>('/reports');
}

export function getAssetUtilization() {
  return apiRequest<AssetUtilizationReport>('/reports/asset-utilization');
}

export function getMaintenanceReport() {
  return apiRequest<MaintenanceReport>('/reports/maintenance');
}

export function getRetirementForecast() {
  return apiRequest<RetirementForecast[]>('/reports/retirement-forecast');
}

export function getAuditSummary() {
  return apiRequest<{ totalCycles: number; completedCycles: number; totalDiscrepancies: number }>('/reports/audit-summary');
}

export function getDashboardKpis() {
  return apiRequest<DashboardKpis>('/dashboard/kpis');
}
