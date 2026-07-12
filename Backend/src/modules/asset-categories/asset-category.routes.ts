import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { requireOrgContext } from '@/middleware/org-context.middleware';
import { allow } from '@/middleware/role.middleware';
import { validate } from '@/middleware/validation.middleware';
import { AssetCategoryController } from './asset-category.controller';
import { createAssetCategorySchema, updateAssetCategorySchema } from './asset-category.validators';

const router = Router();
const controller = new AssetCategoryController();

const authMiddleware = [authenticate, requireOrgContext];

router.get('/', ...authMiddleware, controller.list);
router.get('/:id', ...authMiddleware, controller.getById);
router.post('/', ...authMiddleware, allow('ADMIN', 'ASSET_MANAGER'), validate(createAssetCategorySchema), controller.create);
router.patch('/:id', ...authMiddleware, allow('ADMIN', 'ASSET_MANAGER'), validate(updateAssetCategorySchema), controller.update);
router.delete('/:id', ...authMiddleware, allow('ADMIN'), controller.remove);

export default router;
