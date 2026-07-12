import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { requireOrgContext } from '@/middleware/org-context.middleware';
import { NotificationController } from './notification.controller';

const router = Router();
const controller = new NotificationController();

const authMiddleware = [authenticate, requireOrgContext];

router.get('/unread-count', ...authMiddleware, controller.unreadCount);
router.patch('/read-all', ...authMiddleware, controller.markAllAsRead);
router.get('/', ...authMiddleware, controller.list);
router.patch('/:id/read', ...authMiddleware, controller.markAsRead);

export default router;
