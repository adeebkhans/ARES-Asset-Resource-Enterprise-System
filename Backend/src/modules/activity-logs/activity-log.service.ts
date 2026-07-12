import { ActivityLog } from '@prisma/client';
import { PaginatedResult, PaginationParams } from '@/types/common.types';
import { ActivityLogRepository } from './activity-log.repository';

export class ActivityLogService {
  constructor(private readonly repo: ActivityLogRepository = new ActivityLogRepository()) {}

  async log(params: {
    orgId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.repo.create(params);
  }

  async listByOrg(
    orgId: string,
    params: PaginationParams,
    filters?: { entityType?: string; entityId?: string; userId?: string },
  ): Promise<PaginatedResult<ActivityLog>> {
    return this.repo.listByOrg(orgId, params, filters);
  }

  async listByEntity(
    orgId: string,
    entityType: string,
    entityId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<ActivityLog>> {
    return this.repo.listByEntity(orgId, entityType, entityId, params);
  }
}
