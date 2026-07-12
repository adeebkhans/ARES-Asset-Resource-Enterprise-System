import { prisma } from '@/core/database/prisma';

export type DashboardRole = 'ADMIN' | 'ASSET_MANAGER' | 'DEPARTMENT_HEAD' | 'EMPLOYEE';

export interface DashboardKpis {
  role: DashboardRole;
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
    user: { id: string; name: string } | null;
    timestamp: Date;
  }[];
}

export class DashboardRepository {
  async getAdminKpis(orgId: string, userId: string): Promise<DashboardKpis> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      assetCounts,
      maintenanceCounts,
      approvalCounts,
      unreadCount,
      recentActivity,
    ] = await Promise.all([
      // Asset counts by status
      prisma.asset.groupBy({
        by: ['status'],
        where: { orgId },
        _count: { id: true },
      }),
      // Maintenance counts
      Promise.all([
        prisma.maintenanceRequest.count({ where: { orgId, status: 'PENDING' } }),
        prisma.maintenanceRequest.count({ where: { orgId, status: 'IN_PROGRESS' } }),
        prisma.maintenanceRequest.count({
          where: { orgId, status: 'RESOLVED', resolvedAt: { gte: monthStart } },
        }),
      ]),
      // Approval counts
      Promise.all([
        prisma.approval.count({ where: { orgId, status: 'PENDING' } }),
        prisma.approval.count({
          where: { orgId, status: { in: ['PENDING', 'ESCALATED'] }, dueAt: { lt: now } },
        }),
      ]),
      // Unread notifications
      prisma.notification.count({ where: { orgId, userId, isRead: false } }),
      // Recent activity (last 10)
      prisma.activityLog.findMany({
        where: { orgId },
        orderBy: { timestamp: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          timestamp: true,
          userId: true,
        },
      }),
    ]);

    const assetMap: Record<string, number> = {};
    for (const row of assetCounts) {
      assetMap[row.status] = row._count.id;
    }

    // ActivityLog.userId has no FK to User (it's a plain string so entries
    // survive user deletion), so the actor has to be resolved separately.
    const actorIds = [...new Set(recentActivity.map((a) => a.userId))];
    const actors = await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } });
    const actorById = new Map(actors.map((u) => [u.id, u]));

    return {
      role: 'ADMIN',
      assets: {
        total: Object.values(assetMap).reduce((a, b) => a + b, 0),
        available: assetMap['AVAILABLE'] ?? 0,
        allocated: assetMap['ALLOCATED'] ?? 0,
        underMaintenance: assetMap['UNDER_MAINTENANCE'] ?? 0,
        lost: assetMap['LOST'] ?? 0,
        retired: assetMap['RETIRED'] ?? 0,
      },
      maintenance: {
        pending: maintenanceCounts[0],
        inProgress: maintenanceCounts[1],
        resolvedThisMonth: maintenanceCounts[2],
      },
      approvals: {
        pending: approvalCounts[0],
        overdue: approvalCounts[1],
      },
      notifications: {
        unread: unreadCount,
      },
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        timestamp: a.timestamp,
        user: actorById.get(a.userId) ?? null,
      })),
    };
  }

  async getAssetManagerKpis(orgId: string, userId: string): Promise<DashboardKpis> {
    // Asset managers see org-wide asset + maintenance stats, plus their own approvals
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      assetCounts,
      maintenanceCounts,
      approvalCounts,
      unreadCount,
    ] = await Promise.all([
      prisma.asset.groupBy({
        by: ['status'],
        where: { orgId },
        _count: { id: true },
      }),
      Promise.all([
        prisma.maintenanceRequest.count({ where: { orgId, status: 'PENDING' } }),
        prisma.maintenanceRequest.count({ where: { orgId, status: 'IN_PROGRESS' } }),
        prisma.maintenanceRequest.count({
          where: { orgId, status: 'RESOLVED', resolvedAt: { gte: monthStart } },
        }),
      ]),
      Promise.all([
        prisma.approval.count({ where: { orgId, currentApproverUserId: userId, status: 'PENDING' } }),
        prisma.approval.count({
          where: { orgId, currentApproverUserId: userId, status: { in: ['PENDING', 'ESCALATED'] }, dueAt: { lt: now } },
        }),
      ]),
      prisma.notification.count({ where: { orgId, userId, isRead: false } }),
    ]);

    const assetMap: Record<string, number> = {};
    for (const row of assetCounts) {
      assetMap[row.status] = row._count.id;
    }

    return {
      role: 'ASSET_MANAGER',
      assets: {
        total: Object.values(assetMap).reduce((a, b) => a + b, 0),
        available: assetMap['AVAILABLE'] ?? 0,
        allocated: assetMap['ALLOCATED'] ?? 0,
        underMaintenance: assetMap['UNDER_MAINTENANCE'] ?? 0,
        lost: assetMap['LOST'] ?? 0,
        retired: assetMap['RETIRED'] ?? 0,
      },
      maintenance: {
        pending: maintenanceCounts[0],
        inProgress: maintenanceCounts[1],
        resolvedThisMonth: maintenanceCounts[2],
      },
      approvals: {
        pending: approvalCounts[0],
        overdue: approvalCounts[1],
      },
      notifications: {
        unread: unreadCount,
      },
      recentActivity: [],
    };
  }

  async getDepartmentHeadKpis(orgId: string, userId: string, departmentId: string | null): Promise<DashboardKpis> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Department heads see their department's assets + maintenance
    const deptFilter = departmentId ? { department: { id: departmentId } } : {};

    const [
      assetCounts,
      maintenanceCounts,
      approvalCounts,
      unreadCount,
    ] = await Promise.all([
      prisma.asset.groupBy({
        by: ['status'],
        where: { orgId, ...deptFilter },
        _count: { id: true },
      }),
      Promise.all([
        prisma.maintenanceRequest.count({ where: { orgId, status: 'PENDING' } }),
        prisma.maintenanceRequest.count({ where: { orgId, status: 'IN_PROGRESS' } }),
        prisma.maintenanceRequest.count({
          where: { orgId, status: 'RESOLVED', resolvedAt: { gte: monthStart } },
        }),
      ]),
      Promise.all([
        prisma.approval.count({ where: { orgId, currentApproverUserId: userId, status: 'PENDING' } }),
        prisma.approval.count({
          where: { orgId, currentApproverUserId: userId, status: { in: ['PENDING', 'ESCALATED'] }, dueAt: { lt: now } },
        }),
      ]),
      prisma.notification.count({ where: { orgId, userId, isRead: false } }),
    ]);

    const assetMap: Record<string, number> = {};
    for (const row of assetCounts) {
      assetMap[row.status] = row._count.id;
    }

    return {
      role: 'DEPARTMENT_HEAD',
      assets: {
        total: Object.values(assetMap).reduce((a, b) => a + b, 0),
        available: assetMap['AVAILABLE'] ?? 0,
        allocated: assetMap['ALLOCATED'] ?? 0,
        underMaintenance: assetMap['UNDER_MAINTENANCE'] ?? 0,
        lost: assetMap['LOST'] ?? 0,
        retired: assetMap['RETIRED'] ?? 0,
      },
      maintenance: {
        pending: maintenanceCounts[0],
        inProgress: maintenanceCounts[1],
        resolvedThisMonth: maintenanceCounts[2],
      },
      approvals: {
        pending: approvalCounts[0],
        overdue: approvalCounts[1],
      },
      notifications: {
        unread: unreadCount,
      },
      recentActivity: [],
    };
  }

  async getEmployeeKpis(orgId: string, userId: string): Promise<DashboardKpis> {
    // Employees see only their own requests and notifications
    const [
      myMaintenanceCount,
      myPendingApprovals,
      unreadCount,
    ] = await Promise.all([
      prisma.maintenanceRequest.count({ where: { orgId, raisedById: userId } }),
      prisma.approval.count({ where: { orgId, currentApproverUserId: userId, status: 'PENDING' } }),
      prisma.notification.count({ where: { orgId, userId, isRead: false } }),
    ]);

    return {
      role: 'EMPLOYEE',
      assets: {
        total: 0,
        available: 0,
        allocated: 0,
        underMaintenance: 0,
        lost: 0,
        retired: 0,
      },
      maintenance: {
        pending: myMaintenanceCount,
        inProgress: 0,
        resolvedThisMonth: 0,
      },
      approvals: {
        pending: myPendingApprovals,
        overdue: 0,
      },
      notifications: {
        unread: unreadCount,
      },
      recentActivity: [],
    };
  }
}
