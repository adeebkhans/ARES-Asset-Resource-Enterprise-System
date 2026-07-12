import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { requireOrgContext } from '@/middleware/org-context.middleware';
import { validate } from '@/middleware/validation.middleware';
import { AuthController } from './auth.controller';
import {
  loginSchema,
  refreshSchema,
  registerOrganizationSchema,
  signupSchema,
} from './auth.validators';

const router = Router();
const controller = new AuthController();

router.post('/register-organization', validate(registerOrganizationSchema), controller.registerOrganization);
router.post('/signup', validate(signupSchema), controller.signup);
router.post('/login', validate(loginSchema), controller.login);
router.post('/refresh', validate(refreshSchema), controller.refresh);
router.post('/logout', validate(refreshSchema), controller.logout);
router.get('/me', authenticate, requireOrgContext, controller.me);

export default router;
