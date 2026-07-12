import { Request, Response } from 'express';
import { asyncHandler } from '@/core/base/asyncHandler';
import { sendSuccess } from '@/utils/response';
import { IndustryTemplateService } from './industry-template.service';

export class IndustryTemplateController {
  constructor(private readonly service: IndustryTemplateService = new IndustryTemplateService()) {}

  list = asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, this.service.listTemplates());
  });

  apply = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.applyTemplate(req.auth!.orgId, req.body.tag, req.auth!.userId);
    sendSuccess(res, result, 201);
  });
}
