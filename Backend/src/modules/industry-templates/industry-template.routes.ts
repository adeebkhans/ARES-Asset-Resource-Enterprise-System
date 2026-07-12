import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { requireOrgContext } from '@/middleware/org-context.middleware';
import { allow } from '@/middleware/role.middleware';
import { validate } from '@/middleware/validation.middleware';
import { IndustryTemplateController } from './industry-template.controller';
import { applyTemplateSchema } from './industry-template.validators';

const router = Router();
const controller = new IndustryTemplateController();

const authMiddleware = [authenticate, requireOrgContext];

router.get('/', ...authMiddleware, controller.list);
router.post('/apply', ...authMiddleware, allow('ADMIN'), validate(applyTemplateSchema), controller.apply);

export default router;
