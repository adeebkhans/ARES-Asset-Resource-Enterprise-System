import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { requireOrgContext } from '@/middleware/org-context.middleware';
import { allow } from '@/middleware/role.middleware';
import { validate } from '@/middleware/validation.middleware';
import { EmployeeController } from './employee.controller';
import { updateEmployeeRoleSchema, updateEmployeeSchema } from './employee.validators';

const router = Router();
const controller = new EmployeeController();

const authMiddleware = [authenticate, requireOrgContext];

// The Employee Directory (names, emails, roles) is Admin-only per the Org Setup
// screen spec (plan.md) — unlike Departments/Categories it carries PII and role
// assignments, so it isn't opened up to other roles the way those are.
router.get('/', ...authMiddleware, allow('ADMIN'), controller.list);
router.get('/:id', ...authMiddleware, allow('ADMIN'), controller.getById);
router.patch('/:id', ...authMiddleware, allow('ADMIN'), validate(updateEmployeeSchema), controller.update);
router.patch('/:id/role', ...authMiddleware, allow('ADMIN'), validate(updateEmployeeRoleSchema), controller.updateRole);

export default router;
