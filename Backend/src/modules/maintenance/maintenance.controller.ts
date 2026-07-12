import { Request, Response } from 'express';
import { asyncHandler } from '@/core/base/asyncHandler';
import { sendPaginated, sendSuccess } from '@/utils/response';
import { paginationQuerySchema } from '@/utils/pagination';
import { MaintenanceService } from './maintenance.service';
import { maintenanceSearchSchema } from './maintenance.validators';

export class MaintenanceController {
  constructor(private readonly service: MaintenanceService = new MaintenanceService()) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    const params = paginationQuerySchema.parse(req.query);
    const result = await this.service.list(req.auth!.orgId, params);
    sendPaginated(res, result);
  });

  search = asyncHandler(async (req: Request, res: Response) => {
    const params = maintenanceSearchSchema.parse(req.query);
    const result = await this.service.search(req.auth!.orgId, params);
    sendPaginated(res, result);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const request = await this.service.getById(req.auth!.orgId, req.params.id);
    sendSuccess(res, request);
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const request = await this.service.create(req.auth!.orgId, req.body, req.auth!.userId);
    sendSuccess(res, request, 201);
  });

  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const request = await this.service.updateStatus(
      req.auth!.orgId,
      req.params.id,
      req.body,
      req.auth!.userId,
    );
    sendSuccess(res, request);
  });

  getApproval = asyncHandler(async (req: Request, res: Response) => {
    const approval = await this.service.getApproval(req.auth!.orgId, req.params.id);
    sendSuccess(res, approval);
  });

  statusCounts = asyncHandler(async (req: Request, res: Response) => {
    const counts = await this.service.getStatusCounts(req.auth!.orgId);
    sendSuccess(res, counts);
  });
}
