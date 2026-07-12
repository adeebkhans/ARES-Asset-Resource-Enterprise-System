import { Request, Response } from 'express';
import { asyncHandler } from '@/core/base/asyncHandler';
import { sendPaginated, sendSuccess } from '@/utils/response';
import { EmployeeService } from './employee.service';
import { paginationQuerySchema } from '@/utils/pagination';
import { Role } from '@/constants/roles';

export class EmployeeController {
  constructor(private readonly service: EmployeeService = new EmployeeService()) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    const params = paginationQuerySchema.parse(req.query);
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const result = await this.service.list(req.auth!.orgId, params, search);
    sendPaginated(res, result);
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
      req.auth!.role as Role,
      req.auth!.userId,
    );
    sendSuccess(res, emp);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const emp = await this.service.update(req.auth!.orgId, req.params.id, req.body);
    sendSuccess(res, emp);
  });
}
