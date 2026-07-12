import { Request, Response } from 'express';
import { asyncHandler } from '@/core/base/asyncHandler';
import { sendPaginated, sendSuccess } from '@/utils/response';
import { paginationQuerySchema } from '@/utils/pagination';
import { AuditService } from './audit.service';
import { auditSearchSchema } from './audit.validators';

export class AuditController {
  constructor(private readonly service: AuditService = new AuditService()) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    const params = paginationQuerySchema.parse(req.query);
    const result = await this.service.list(req.auth!.orgId, params);
    sendPaginated(res, result);
  });

  search = asyncHandler(async (req: Request, res: Response) => {
    const params = auditSearchSchema.parse(req.query);
    const result = await this.service.search(req.auth!.orgId, params);
    sendPaginated(res, result);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const cycle = await this.service.getById(req.auth!.orgId, req.params.id);
    sendSuccess(res, cycle);
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const cycle = await this.service.create(req.auth!.orgId, req.body, req.auth!.userId);
    sendSuccess(res, cycle, 201);
  });

  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const cycle = await this.service.updateStatus(
      req.auth!.orgId,
      req.params.id,
      req.body,
      req.auth!.userId,
    );
    sendSuccess(res, cycle);
  });

  submitRecord = asyncHandler(async (req: Request, res: Response) => {
    const record = await this.service.submitRecord(
      req.auth!.orgId,
      req.params.id,
      req.body,
      req.auth!.userId,
    );
    sendSuccess(res, record, 201);
  });

  getRecords = asyncHandler(async (req: Request, res: Response) => {
    const records = await this.service.getRecords(req.auth!.orgId, req.params.id);
    sendSuccess(res, records);
  });

  getAssignedCycles = asyncHandler(async (req: Request, res: Response) => {
    const cycles = await this.service.getAssignedCycles(req.auth!.userId);
    sendSuccess(res, cycles);
  });

  statusCounts = asyncHandler(async (req: Request, res: Response) => {
    const counts = await this.service.getStatusCounts(req.auth!.orgId);
    sendSuccess(res, counts);
  });
}
