import { Request, Response } from 'express';
import { asyncHandler } from '@/core/base/asyncHandler';
import { sendPaginated, sendSuccess } from '@/utils/response';
import { paginationQuerySchema } from '@/utils/pagination';
import { AssetService } from './asset.service';
import { assetSearchSchema } from './asset.validators';

export class AssetController {
  constructor(private readonly service: AssetService = new AssetService()) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    const params = paginationQuerySchema.parse(req.query);
    const result = await this.service.list(req.auth!.orgId, params);
    sendPaginated(res, result);
  });

  search = asyncHandler(async (req: Request, res: Response) => {
    const params = assetSearchSchema.parse(req.query);
    const result = await this.service.search(req.auth!.orgId, params);
    sendPaginated(res, result);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const asset = await this.service.getById(req.auth!.orgId, req.params.id);
    sendSuccess(res, asset);
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const asset = await this.service.create(req.auth!.orgId, req.body, req.auth!.userId);
    sendSuccess(res, asset, 201);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const asset = await this.service.update(req.auth!.orgId, req.params.id, req.body);
    sendSuccess(res, asset);
  });

  transitionStatus = asyncHandler(async (req: Request, res: Response) => {
    const asset = await this.service.transitionStatus(
      req.auth!.orgId,
      req.params.id,
      req.body,
      req.auth!.userId,
    );
    sendSuccess(res, asset);
  });

  statusCounts = asyncHandler(async (req: Request, res: Response) => {
    const counts = await this.service.getStatusCounts(req.auth!.orgId);
    sendSuccess(res, counts);
  });
}
