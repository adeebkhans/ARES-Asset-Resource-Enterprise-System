import { prisma } from '@/core/database/prisma';

export interface AssetUtilizationReport {
  totalAssets: number;
  byStatus: Record<string, number>;
  byCategory: { categoryId: string; categoryName: string; count: number; available: number; allocated: number }[];
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
  acquisitionDate: Date | null;
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

export class ReportsRepository {
  async getAssetUtilization(orgId: string): Promise<AssetUtilizationReport> {
    const [assets, byCategory] = await Promise.all([
      prisma.asset.groupBy({
        by: ['status'],
        where: { orgId },
        _count: { id: true },
      }),
      prisma.assetCategory.findMany({
        where: { orgId },
        include: {
          assets: {
            select: { status: true },
          },
        },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    let totalAssets = 0;
    for (const row of assets) {
      byStatus[row.status] = row._count.id;
      totalAssets += row._count.id;
    }

    const categoryData = byCategory.map((cat) => {
      const count = cat.assets.length;
      const available = cat.assets.filter((a) => a.status === 'AVAILABLE').length;
      const allocated = cat.assets.filter((a) => a.status === 'ALLOCATED').length;
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        count,
        available,
        allocated,
      };
    });

    const allocatedCount = byStatus['ALLOCATED'] ?? 0;
    const reservedCount = byStatus['RESERVED'] ?? 0;
    const utilizationRate = totalAssets > 0 ? ((allocatedCount + reservedCount) / totalAssets) * 100 : 0;

    return {
      totalAssets,
      byStatus,
      byCategory: categoryData,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
    };
  }

  async getMaintenanceReport(orgId: string): Promise<MaintenanceReport> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [byStatus, byPriority, resolvedThisMonth, resolvedLastMonth, resolvedRequests] = await Promise.all([
      prisma.maintenanceRequest.groupBy({
        by: ['status'],
        where: { orgId },
        _count: { id: true },
      }),
      prisma.maintenanceRequest.groupBy({
        by: ['priority'],
        where: { orgId },
        _count: { id: true },
      }),
      prisma.maintenanceRequest.count({
        where: { orgId, status: 'RESOLVED', resolvedAt: { gte: monthStart } },
      }),
      prisma.maintenanceRequest.count({
        where: {
          orgId,
          status: 'RESOLVED',
          resolvedAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      }),
      prisma.maintenanceRequest.findMany({
        where: { orgId, status: 'RESOLVED' },
        select: { createdAt: true, resolvedAt: true },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const row of byStatus) {
      statusMap[row.status] = row._count.id;
    }

    const priorityMap: Record<string, number> = {};
    for (const row of byPriority) {
      priorityMap[row.priority] = row._count.id;
    }

    const totalRequests = Object.values(statusMap).reduce((a, b) => a + b, 0);

    // Calculate average resolution time
    let averageResolutionDays: number | null = null;
    if (resolvedRequests.length > 0) {
      const totalDays = resolvedRequests.reduce((sum, r) => {
        const created = new Date(r.createdAt).getTime();
        const resolved = new Date(r.resolvedAt!).getTime();
        return sum + (resolved - created) / (1000 * 60 * 60 * 24);
      }, 0);
      averageResolutionDays = Math.round((totalDays / resolvedRequests.length) * 10) / 10;
    }

    let trend: 'up' | 'down' | 'flat' = 'flat';
    if (resolvedThisMonth > resolvedLastMonth) trend = 'up';
    else if (resolvedThisMonth < resolvedLastMonth) trend = 'down';

    return {
      totalRequests,
      byStatus: statusMap,
      byPriority: priorityMap,
      averageResolutionDays,
      resolvedThisMonth,
      resolvedLastMonth,
      trend,
    };
  }

  async getRetirementForecast(orgId: string): Promise<RetirementForecast[]> {
    // Assets older than 3 years that are not yet retired/disposed
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const assets = await prisma.asset.findMany({
      where: {
        orgId,
        acquisitionDate: { not: null, lte: threeYearsAgo },
        status: { notIn: ['RETIRED', 'DISPOSED'] },
      },
      include: {
        category: { select: { name: true } },
      },
      orderBy: { acquisitionDate: 'asc' },
      take: 50,
    });

    return assets.map((a) => {
      const ageMs = Date.now() - new Date(a.acquisitionDate!).getTime();
      const ageMonths = Math.floor(ageMs / (1000 * 60 * 60 * 24 * 30));
      return {
        assetId: a.id,
        assetTag: a.assetTag,
        name: a.name,
        category: a.category?.name ?? '—',
        acquisitionDate: a.acquisitionDate,
        ageMonths,
        status: a.status,
      };
    });
  }

  async getAuditSummary(orgId: string) {
    const [totalCycles, completedCycles, discrepancyReports] = await Promise.all([
      prisma.auditCycle.count({ where: { orgId } }),
      prisma.auditCycle.count({ where: { orgId, status: 'CLOSED' } }),
      prisma.discrepancyReport.findMany({
        where: { auditCycle: { orgId } },
        select: { itemCount: true },
      }),
    ]);

    const totalDiscrepancies = discrepancyReports.reduce((sum, r) => sum + r.itemCount, 0);

    return {
      totalCycles,
      completedCycles,
      totalDiscrepancies,
    };
  }

  async getFullReport(orgId: string): Promise<ReportSummary> {
    const [assetUtilization, maintenance, retirementForecast, auditSummary] = await Promise.all([
      this.getAssetUtilization(orgId),
      this.getMaintenanceReport(orgId),
      this.getRetirementForecast(orgId),
      this.getAuditSummary(orgId),
    ]);

    return {
      assetUtilization,
      maintenance,
      retirementForecast,
      auditSummary,
    };
  }
}
