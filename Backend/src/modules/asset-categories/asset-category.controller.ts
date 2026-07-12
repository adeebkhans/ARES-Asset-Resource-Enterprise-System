import { Request, Response } from 'express';
import { asyncHandler } from '@/core/base/asyncHandler';
import { sendPaginated, sendSuccess } from '@/utils/response';
import { paginationQuerySchema } from '@/utils/pagination';
import { CustomObjectService } from '@/modules/custom-objects/custom-object.service';
import { AssetCategoryService } from './asset-category.service';

export class AssetCategoryController {
  constructor(
    private readonly service: AssetCategoryService = new AssetCategoryService(),
    private readonly customObjectService: CustomObjectService = new CustomObjectService(),
  ) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    const params = paginationQuerySchema.parse(req.query);
    const result = await this.service.list(req.auth!.orgId, params);
    sendPaginated(res, result);
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

  // Layer 1 of the Configurable Object Framework (plan.md §7.1) — category-specific asset fields.
  listFields = asyncHandler(async (req: Request, res: Response) => {
    const fields = await this.customObjectService.listFieldsForCategory(req.auth!.orgId, req.params.id);
    sendSuccess(res, fields);
  });

  createField = asyncHandler(async (req: Request, res: Response) => {
    const field = await this.customObjectService.createFieldForCategory(req.auth!.orgId, req.params.id, req.body);
    sendSuccess(res, field, 201);
  });
}
