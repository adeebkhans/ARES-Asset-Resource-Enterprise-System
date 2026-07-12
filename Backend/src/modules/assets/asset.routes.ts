import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { requireOrgContext } from '@/middleware/org-context.middleware';
import { allow } from '@/middleware/role.middleware';
import { validate } from '@/middleware/validation.middleware';
import { AssetController } from './asset.controller';
import { createAssetSchema, updateAssetSchema, assetStatusTransitionSchema } from './asset.validators';

const router = Router();
const controller = new AssetController();

const authMiddleware = [authenticate, requireOrgContext];

router.get('/status-counts', ...authMiddleware, controller.statusCounts);
router.get('/search', ...authMiddleware, controller.search);
router.get('/', ...authMiddleware, controller.list);
router.get('/:id', ...authMiddleware, controller.getById);
router.post('/', ...authMiddleware, allow('ADMIN', 'ASSET_MANAGER'), validate(createAssetSchema), controller.create);
router.patch('/:id', ...authMiddleware, allow('ADMIN', 'ASSET_MANAGER'), validate(updateAssetSchema), controller.update);
router.post('/:id/transition', ...authMiddleware, allow('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'), validate(assetStatusTransitionSchema), controller.transitionStatus);

export default router;
