import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { requireOrgContext } from '@/middleware/org-context.middleware';
import { allow } from '@/middleware/role.middleware';
import { validate } from '@/middleware/validation.middleware';
import { CustomObjectController } from './custom-object.controller';
import {
  createFieldDefinitionSchema,
  createObjectDefinitionSchema,
  updateFieldDefinitionSchema,
  updateObjectDefinitionSchema,
  upsertRecordSchema,
} from './custom-object.validators';

const router = Router();
const controller = new CustomObjectController();

const authMiddleware = [authenticate, requireOrgContext];
// Schema-level changes (defining new entities/fields) are Admin-only, matching
// Organization Setup; day-to-day record management is open to management roles.
const manageSchema = allow('ADMIN');
const manageRecords = allow('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD');

router.get('/', ...authMiddleware, controller.listDefinitions);
router.post('/', ...authMiddleware, manageSchema, validate(createObjectDefinitionSchema), controller.createDefinition);

router.patch('/fields/:fieldId', ...authMiddleware, manageSchema, validate(updateFieldDefinitionSchema), controller.updateField);
router.delete('/fields/:fieldId', ...authMiddleware, manageSchema, controller.deleteField);

router.get('/:id', ...authMiddleware, controller.getDefinition);
router.patch('/:id', ...authMiddleware, manageSchema, validate(updateObjectDefinitionSchema), controller.updateDefinition);
router.delete('/:id', ...authMiddleware, manageSchema, controller.deleteDefinition);

router.get('/:id/fields', ...authMiddleware, controller.listFieldsForObject);
router.post('/:id/fields', ...authMiddleware, manageSchema, validate(createFieldDefinitionSchema), controller.createFieldForObject);

router.get('/:id/records', ...authMiddleware, controller.listRecords);
router.post('/:id/records', ...authMiddleware, manageRecords, validate(upsertRecordSchema), controller.createRecord);

router.get('/records/:recordId', ...authMiddleware, controller.getRecord);
router.patch('/records/:recordId', ...authMiddleware, manageRecords, validate(upsertRecordSchema), controller.updateRecord);
router.delete('/records/:recordId', ...authMiddleware, manageRecords, controller.deleteRecord);

export default router;
