import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { requireOrgContext } from '@/middleware/org-context.middleware';
import { allow } from '@/middleware/role.middleware';
import { ReportsController } from './reports.controller';

const router = Router();
const controller = new ReportsController();

router.use(authenticate, requireOrgContext);

router.get('/', allow('ADMIN', 'ASSET_MANAGER'), controller.getFullReport);
router.get('/asset-utilization', allow('ADMIN', 'ASSET_MANAGER'), controller.getAssetUtilization);
router.get('/maintenance', allow('ADMIN', 'ASSET_MANAGER'), controller.getMaintenanceReport);
router.get('/retirement-forecast', allow('ADMIN', 'ASSET_MANAGER'), controller.getRetirementForecast);
router.get('/audit-summary', allow('ADMIN', 'ASSET_MANAGER'), controller.getAuditSummary);

export default router;
