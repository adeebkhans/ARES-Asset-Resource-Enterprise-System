import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { requireOrgContext } from '@/middleware/org-context.middleware';
import { allow } from '@/middleware/role.middleware';
import { validate } from '@/middleware/validation.middleware';
import { DepartmentController } from './department.controller';
import { createDepartmentSchema, updateDepartmentSchema } from './department.validators';

const router = Router();
const controller = new DepartmentController();

const authMiddleware = [authenticate, requireOrgContext];

router.get('/', ...authMiddleware, controller.list);
router.get('/tree', ...authMiddleware, controller.getTree);
router.get('/:id', ...authMiddleware, controller.getById);
router.post('/', ...authMiddleware, allow('ADMIN'), validate(createDepartmentSchema), controller.create);
router.patch('/:id', ...authMiddleware, allow('ADMIN'), validate(updateDepartmentSchema), controller.update);
router.delete('/:id', ...authMiddleware, allow('ADMIN'), controller.remove);

export default router;
