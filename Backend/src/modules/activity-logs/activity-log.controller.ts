import { Request, Response } from 'express';
import { asyncHandler } from '@/core/base/asyncHandler';
import { sendSuccess } from '@/utils/response';
import { ActivityLogService } from './activity-log.service';
import { paginationQuerySchema } from '@/utils/pagination';

export class ActivityLogController {
  constructor(private readonly service: ActivityLogService = new ActivityLogService()) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    const params = paginationQuerySchema.parse(req.query);
    const filters: Record<string, string> = {};
    if (typeof req.query.entityType === 'string') filters.entityType = req.query.entityType;
    if (typeof req.query.entityId === 'string') filters.entityId = req.query.entityId;
    if (typeof req.query.userId === 'string') filters.userId = req.query.userId;

    const result = await this.service.listByOrg(req.auth!.orgId, params, filters);
    sendSuccess(res, result.items, 200);
  });
}
