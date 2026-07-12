import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { requireOrgContext } from '@/middleware/org-context.middleware';
import { allow } from '@/middleware/role.middleware';
import { validate } from '@/middleware/validation.middleware';
import { ApprovalController } from './approval.controller';
import {
  upsertRuleSchema,
  decideApprovalSchema,
  createDelegationSchema,
  approvalSearchSchema,
} from './approval.validators';

const router = Router();
const controller = new ApprovalController();

router.use(authenticate, requireOrgContext);

// Rules (Admin only)
router.post('/rules', allow('ADMIN'), validate(upsertRuleSchema), controller.upsertRule);
router.get('/rules/:type', allow('ADMIN'), controller.getRule);

// Search & counts
router.get('/', validate(approvalSearchSchema), controller.search);
router.get('/pending', controller.getPending);
router.get('/status-counts', controller.getStatusCounts);
router.get('/entity/:entityType/:entityId', controller.getByEntity);

// Decide
router.patch('/:id/approve', validate(decideApprovalSchema), controller.approve);
router.patch('/:id/reject', validate(decideApprovalSchema), controller.reject);

// Delegations
router.post('/delegations', validate(createDelegationSchema), controller.createDelegation);
router.get('/delegations', controller.getDelegations);
router.delete('/delegations/:id', controller.revokeDelegation);

export default router;
