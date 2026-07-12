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

router.get('/', ...authMiddleware, controller.list);
router.get('/:id', ...authMiddleware, controller.getById);
router.patch('/:id', ...authMiddleware, allow('ADMIN'), validate(updateEmployeeSchema), controller.update);
router.patch('/:id/role', ...authMiddleware, allow('ADMIN'), validate(updateEmployeeRoleSchema), controller.updateRole);

export default router;
