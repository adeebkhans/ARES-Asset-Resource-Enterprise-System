import { Request, Response } from 'express';
import { asyncHandler } from '@/core/base/asyncHandler';
import { sendPaginated, sendSuccess } from '@/utils/response';
import { paginationQuerySchema } from '@/utils/pagination';
import { CustomObjectService } from './custom-object.service';

export class CustomObjectController {
  constructor(private readonly service: CustomObjectService = new CustomObjectService()) {}

  // Definitions
  listDefinitions = asyncHandler(async (req: Request, res: Response) => {
    const defs = await this.service.listDefinitions(req.auth!.orgId);
    sendSuccess(res, defs);
  });

  getDefinition = asyncHandler(async (req: Request, res: Response) => {
    const def = await this.service.getDefinition(req.auth!.orgId, req.params.id);
    sendSuccess(res, def);
  });

  createDefinition = asyncHandler(async (req: Request, res: Response) => {
    const def = await this.service.createDefinition(req.auth!.orgId, req.body, req.auth!.userId);
    sendSuccess(res, def, 201);
  });

  updateDefinition = asyncHandler(async (req: Request, res: Response) => {
    const def = await this.service.updateDefinition(req.auth!.orgId, req.params.id, req.body);
    sendSuccess(res, def);
  });

  deleteDefinition = asyncHandler(async (req: Request, res: Response) => {
    await this.service.deleteDefinition(req.auth!.orgId, req.params.id);
    sendSuccess(res, { deleted: true });
  });

  // Fields
  listFieldsForObject = asyncHandler(async (req: Request, res: Response) => {
    const fields = await this.service.listFieldsForObject(req.auth!.orgId, req.params.id);
    sendSuccess(res, fields);
  });

  createFieldForObject = asyncHandler(async (req: Request, res: Response) => {
    const field = await this.service.createFieldForObject(req.auth!.orgId, req.params.id, req.body);
    sendSuccess(res, field, 201);
  });

  updateField = asyncHandler(async (req: Request, res: Response) => {
    const field = await this.service.updateField(req.auth!.orgId, req.params.fieldId, req.body);
    sendSuccess(res, field);
  });

  deleteField = asyncHandler(async (req: Request, res: Response) => {
    await this.service.deleteField(req.auth!.orgId, req.params.fieldId);
    sendSuccess(res, { deleted: true });
  });

  // Records
  listRecords = asyncHandler(async (req: Request, res: Response) => {
    const params = paginationQuerySchema.parse(req.query);
    const result = await this.service.listRecords(req.auth!.orgId, req.params.id, params);
    sendPaginated(res, result);
  });

  getRecord = asyncHandler(async (req: Request, res: Response) => {
    const record = await this.service.getRecord(req.auth!.orgId, req.params.recordId);
    sendSuccess(res, record);
  });

  createRecord = asyncHandler(async (req: Request, res: Response) => {
    const record = await this.service.createRecord(req.auth!.orgId, req.params.id, req.body.data, req.auth!.userId);
    sendSuccess(res, record, 201);
  });

  updateRecord = asyncHandler(async (req: Request, res: Response) => {
    const record = await this.service.updateRecord(req.auth!.orgId, req.params.recordId, req.body.data, req.auth!.userId);
    sendSuccess(res, record);
  });

  deleteRecord = asyncHandler(async (req: Request, res: Response) => {
    await this.service.deleteRecord(req.auth!.orgId, req.params.recordId, req.auth!.userId);
    sendSuccess(res, { deleted: true });
  });
}
