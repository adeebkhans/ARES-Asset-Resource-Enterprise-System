import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { requireOrgContext } from '@/middleware/org-context.middleware';
import { DashboardController } from './dashboard.controller';

const router = Router();
const controller = new DashboardController();

router.get('/kpis', authenticate, requireOrgContext, controller.getKpis);

export default router;
