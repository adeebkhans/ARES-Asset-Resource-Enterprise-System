import { Request, Response } from 'express';
import { BaseController } from '@/core/base/BaseController';
import { DepartmentService } from './department.service';
import { asyncHandler } from '@/core/base/asyncHandler';
import { sendSuccess } from '@/utils/response';

export class DepartmentController extends BaseController<unknown> {
  constructor(private readonly deptService: DepartmentService = new DepartmentService()) {
    super(deptService);
  }

  create = asyncHandler(async (req: Request, res: Response) => {
    const dept = await this.deptService.create(req.auth!.orgId, req.body);
    sendSuccess(res, dept, 201);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const dept = await this.deptService.update(req.auth!.orgId, req.params.id, req.body);
    sendSuccess(res, dept);
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await this.deptService.remove(req.auth!.orgId, req.params.id);
    sendSuccess(res, { deleted: true });
  });

  getTree = asyncHandler(async (req: Request, res: Response) => {
    const tree = await this.deptService.getTree(req.auth!.orgId);
    sendSuccess(res, tree);
  });
}
