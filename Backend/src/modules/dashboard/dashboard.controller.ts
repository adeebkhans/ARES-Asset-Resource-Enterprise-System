import { Request, Response } from 'express';
import { asyncHandler } from '@/core/base/asyncHandler';
import { sendSuccess } from '@/utils/response';
import { DashboardService } from './dashboard.service';

export class DashboardController {
  constructor(private readonly service: DashboardService = new DashboardService()) {}

  getKpis = asyncHandler(async (req: Request, res: Response) => {
    const kpis = await this.service.getKpis(
      req.auth!.orgId,
      req.auth!.userId,
      req.auth!.role as any,
      req.auth!.departmentId,
    );
    sendSuccess(res, kpis);
  });
}
