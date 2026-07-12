import { Request, Response } from 'express';
import { asyncHandler } from '@/core/base/asyncHandler';
import { sendSuccess } from '@/utils/response';
import { AssetCategoryService } from './asset-category.service';

export class AssetCategoryController {
  constructor(private readonly service: AssetCategoryService = new AssetCategoryService()) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.list(req.auth!.orgId, req.query as any);
    sendSuccess(res, result.items, 200);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const cat = await this.service.getById(req.auth!.orgId, req.params.id);
    sendSuccess(res, cat);
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const cat = await this.service.create(req.auth!.orgId, req.body);
    sendSuccess(res, cat, 201);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const cat = await this.service.update(req.auth!.orgId, req.params.id, req.body);
    sendSuccess(res, cat);
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await this.service.remove(req.auth!.orgId, req.params.id);
    sendSuccess(res, { deleted: true });
  });
}
