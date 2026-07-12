import { ActivityLog, Prisma } from '@prisma/client';
import { prisma } from '@/core/database/prisma';
import { PaginatedResult, PaginationParams } from '@/types/common.types';
import { buildPaginatedResult, toSkipTake } from '@/utils/pagination';

export class ActivityLogRepository {
  async create(data: {
    orgId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }): Promise<ActivityLog> {
    return prisma.activityLog.create({
      data: {
        ...data,
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async listByOrg(
    orgId: string,
    params: PaginationParams,
    filters?: { entityType?: string; entityId?: string; userId?: string },
  ): Promise<PaginatedResult<ActivityLog>> {
    const { skip, take } = toSkipTake(params);
    const where: Record<string, unknown> = { orgId };
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.entityId) where.entityId = filters.entityId;
    if (filters?.userId) where.userId = filters.userId;

    const [items, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip,
        take,
        orderBy: { timestamp: 'desc' },
      }),
      prisma.activityLog.count({ where }),
    ]);
    return buildPaginatedResult(items, total, params);
  }

  async listByEntity(
    orgId: string,
    entityType: string,
    entityId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<ActivityLog>> {
    return this.listByOrg(orgId, params, { entityType, entityId });
  }
}
