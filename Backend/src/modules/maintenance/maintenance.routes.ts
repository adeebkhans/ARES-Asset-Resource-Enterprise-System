import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { requireOrgContext } from '@/middleware/org-context.middleware';
import { allow } from '@/middleware/role.middleware';
import { validate } from '@/middleware/validation.middleware';
import { MaintenanceController } from './maintenance.controller';
import { createMaintenanceRequestSchema, updateMaintenanceStatusSchema } from './maintenance.validators';

const router = Router();
const controller = new MaintenanceController();

const authMiddleware = [authenticate, requireOrgContext];

router.get('/status-counts', ...authMiddleware, controller.statusCounts);
router.get('/search', ...authMiddleware, controller.search);
router.get('/', ...authMiddleware, controller.list);
router.get('/:id', ...authMiddleware, controller.getById);
router.get('/:id/approval', ...authMiddleware, controller.getApproval);
router.post('/', ...authMiddleware, validate(createMaintenanceRequestSchema), controller.create);
router.patch(
  '/:id/status',
  ...authMiddleware,
  allow('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'),
  validate(updateMaintenanceStatusSchema),
  controller.updateStatus,
);

export default router;
