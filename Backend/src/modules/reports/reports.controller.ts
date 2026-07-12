import { Request, Response } from 'express';
import { asyncHandler } from '@/core/base/asyncHandler';
import { sendSuccess } from '@/utils/response';
import { ReportsService } from './reports.service';

export class ReportsController {
  constructor(private readonly service: ReportsService = new ReportsService()) {}

  getFullReport = asyncHandler(async (req: Request, res: Response) => {
    const report = await this.service.getFullReport(req.auth!.orgId);
    sendSuccess(res, report);
  });

  getAssetUtilization = asyncHandler(async (req: Request, res: Response) => {
    const report = await this.service.getAssetUtilization(req.auth!.orgId);
    sendSuccess(res, report);
  });

  getMaintenanceReport = asyncHandler(async (req: Request, res: Response) => {
    const report = await this.service.getMaintenanceReport(req.auth!.orgId);
    sendSuccess(res, report);
  });

  getRetirementForecast = asyncHandler(async (req: Request, res: Response) => {
    const forecast = await this.service.getRetirementForecast(req.auth!.orgId);
    sendSuccess(res, forecast);
  });

  getAuditSummary = asyncHandler(async (req: Request, res: Response) => {
    const summary = await this.service.getAuditSummary(req.auth!.orgId);
    sendSuccess(res, summary);
  });
}
