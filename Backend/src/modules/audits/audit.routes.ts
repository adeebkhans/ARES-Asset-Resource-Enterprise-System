import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { requireOrgContext } from '@/middleware/org-context.middleware';
import { allow } from '@/middleware/role.middleware';
import { validate } from '@/middleware/validation.middleware';
import { AuditController } from './audit.controller';
import { createAuditCycleSchema, updateAuditCycleSchema, submitAuditRecordSchema } from './audit.validators';

const router = Router();
const controller = new AuditController();

const authMiddleware = [authenticate, requireOrgContext];

router.get('/status-counts', ...authMiddleware, controller.statusCounts);
router.get('/my-assignments', ...authMiddleware, controller.getAssignedCycles);
router.get('/search', ...authMiddleware, controller.search);
router.get('/', ...authMiddleware, controller.list);
router.get('/:id', ...authMiddleware, controller.getById);
router.post(
  '/',
  ...authMiddleware,
  allow('ADMIN', 'ASSET_MANAGER'),
  validate(createAuditCycleSchema),
  controller.create,
);
router.patch(
  '/:id/status',
  ...authMiddleware,
  allow('ADMIN', 'ASSET_MANAGER'),
  validate(updateAuditCycleSchema),
  controller.updateStatus,
);
router.post(
  '/:id/records',
  ...authMiddleware,
  allow('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'),
  validate(submitAuditRecordSchema),
  controller.submitRecord,
);
router.get('/:id/records', ...authMiddleware, controller.getRecords);

export default router;
