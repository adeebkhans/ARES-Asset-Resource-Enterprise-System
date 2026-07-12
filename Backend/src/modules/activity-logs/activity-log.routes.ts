import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { requireOrgContext } from '@/middleware/org-context.middleware';
import { allow } from '@/middleware/role.middleware';
import { ActivityLogController } from './activity-log.controller';

const router = Router();
const controller = new ActivityLogController();

router.get('/', authenticate, requireOrgContext, allow('ADMIN', 'ASSET_MANAGER'), controller.list);

export default router;
