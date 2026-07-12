import { Request, Response } from 'express';
import { asyncHandler } from '@/core/base/asyncHandler';
import { sendSuccess, sendPaginated } from '@/utils/response';
import { ApprovalService } from './approval.service';
import {
  upsertRuleSchema,
  decideApprovalSchema,
  createDelegationSchema,
  approvalSearchSchema,
} from './approval.validators';

export class ApprovalController {
  constructor(private readonly service: ApprovalService = new ApprovalService()) {}

  search = asyncHandler(async (req: Request, res: Response) => {
    const params = approvalSearchSchema.parse(req.query);
    const result = await this.service.search(req.auth!.orgId, { ...params, page: params.page, pageSize: params.pageSize });
    sendPaginated(res, result);
  });

  getPending = asyncHandler(async (req: Request, res: Response) => {
    const approvals = await this.service.getPendingForUser(req.auth!.userId);
    sendSuccess(res, approvals);
  });

  getStatusCounts = asyncHandler(async (req: Request, res: Response) => {
    const counts = await this.service.getStatusCounts(req.auth!.orgId);
    sendSuccess(res, counts);
  });

  getByEntity = asyncHandler(async (req: Request, res: Response) => {
    const { entityType, entityId } = req.params;
    const approval = await this.service.getByEntity(entityType, entityId);
    sendSuccess(res, approval);
  });

  approve = asyncHandler(async (req: Request, res: Response) => {
    const input = decideApprovalSchema.parse(req.body);
    const approval = await this.service.approve(req.auth!.orgId, req.params.id, req.auth!.userId, input);
    sendSuccess(res, approval);
  });

  reject = asyncHandler(async (req: Request, res: Response) => {
    const input = decideApprovalSchema.parse(req.body);
    const approval = await this.service.reject(req.auth!.orgId, req.params.id, req.auth!.userId, input);
    sendSuccess(res, approval);
  });

  upsertRule = asyncHandler(async (req: Request, res: Response) => {
    const input = upsertRuleSchema.parse(req.body);
    const rule = await this.service.upsertRule(req.auth!.orgId, input, req.auth!.userId);
    sendSuccess(res, rule);
  });

  getRule = asyncHandler(async (req: Request, res: Response) => {
    const rule = await this.service.getRule(req.auth!.orgId, req.params.type as any);
    sendSuccess(res, rule);
  });

  createDelegation = asyncHandler(async (req: Request, res: Response) => {
    const input = createDelegationSchema.parse(req.body);
    const delegation = await this.service.createDelegation(req.auth!.orgId, req.auth!.userId, input);
    sendSuccess(res, delegation, 201);
  });

  getDelegations = asyncHandler(async (req: Request, res: Response) => {
    const delegations = await this.service.getDelegations(req.auth!.orgId, req.auth!.userId);
    sendSuccess(res, delegations);
  });

  revokeDelegation = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.revokeDelegation(req.auth!.orgId, req.params.id, req.auth!.userId);
    sendSuccess(res, result);
  });
}
