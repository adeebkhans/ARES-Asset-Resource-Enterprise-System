import { Request, Response } from 'express';
import { asyncHandler } from '@/core/base/asyncHandler';
import { sendSuccess } from '@/utils/response';
import { EmployeeService } from './employee.service';
import { paginationQuerySchema } from '@/utils/pagination';

export class EmployeeController {
  constructor(private readonly service: EmployeeService = new EmployeeService()) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    const params = paginationQuerySchema.parse(req.query);
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const result = await this.service.list(req.auth!.orgId, params, search);
    sendSuccess(res, result.items, 200);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const emp = await this.service.getById(req.auth!.orgId, req.params.id);
    sendSuccess(res, emp);
  });

  updateRole = asyncHandler(async (req: Request, res: Response) => {
    const emp = await this.service.updateRole(
      req.auth!.orgId,
      req.params.id,
      req.body,
      req.auth!.role as any,
    );
    sendSuccess(res, emp);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const emp = await this.service.update(req.auth!.orgId, req.params.id, req.body);
    sendSuccess(res, emp);
  });
}
