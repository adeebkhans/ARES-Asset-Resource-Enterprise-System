import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { requireOrgContext } from '@/middleware/org-context.middleware';
import { allow } from '@/middleware/role.middleware';
import { validate } from '@/middleware/validation.middleware';
import { createFieldDefinitionSchema } from '@/modules/custom-objects/custom-object.validators';
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

// Layer 1 custom fields (plan.md §7.1) — e.g. "warrantyMonths" on the Electronics category.
router.get('/:id/fields', ...authMiddleware, controller.listFields);
router.post('/:id/fields', ...authMiddleware, allow('ADMIN', 'ASSET_MANAGER'), validate(createFieldDefinitionSchema), controller.createField);

export default router;
