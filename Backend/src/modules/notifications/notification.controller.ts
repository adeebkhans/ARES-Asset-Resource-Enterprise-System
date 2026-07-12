import { Request, Response } from 'express';
import { asyncHandler } from '@/core/base/asyncHandler';
import { sendPaginated, sendSuccess } from '@/utils/response';
import { paginationQuerySchema } from '@/utils/pagination';
import { NotificationService } from './notification.service';

export class NotificationController {
  constructor(private readonly service: NotificationService = new NotificationService()) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    const params = paginationQuerySchema.parse(req.query);
    const unreadOnly = req.query.unreadOnly === 'true';
    const result = await this.service.listByUser(req.auth!.orgId, req.auth!.userId, params, unreadOnly);
    sendPaginated(res, result);
  });

  unreadCount = asyncHandler(async (req: Request, res: Response) => {
    const count = await this.service.countUnread(req.auth!.orgId, req.auth!.userId);
    sendSuccess(res, { count });
  });

  markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const notification = await this.service.markAsRead(req.auth!.orgId, req.params.id);
    sendSuccess(res, notification);
  });

  markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    const count = await this.service.markAllAsRead(req.auth!.orgId, req.auth!.userId);
    sendSuccess(res, { markedCount: count });
  });
}
