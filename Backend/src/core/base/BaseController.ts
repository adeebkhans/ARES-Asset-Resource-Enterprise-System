import { Request, RequestHandler, Response } from 'express';
import { ApiError } from '@/core/errors/ApiError';
import { paginationQuerySchema } from '@/utils/pagination';
import { sendPaginated, sendSuccess } from '@/utils/response';
import { BaseService } from './BaseService';
import { asyncHandler } from './asyncHandler';

function requireOrgId(req: Request): string {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth.orgId;
}

/** Generic list/getById route handlers wired to a BaseService. Subclasses add create/update/remove. */
export abstract class BaseController<T> {
  protected constructor(protected readonly service: BaseService<T>) {}

  list: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const params = paginationQuerySchema.parse(req.query);
    const result = await this.service.list(requireOrgId(req), params);
    sendPaginated(res, result);
  });

  getById: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const item = await this.service.getById(requireOrgId(req), req.params.id);
    sendSuccess(res, item);
  });
}
