import { z } from 'zod';

const fieldTypeEnum = z.enum(['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTISELECT', 'RELATION']);
const relationTargetEnum = z.enum(['ASSET', 'USER', 'DEPARTMENT', 'CUSTOM_OBJECT']);

// Machine key for the object itself (CustomObjectDefinition.key) — snake_case, e.g. "room_type".
const objectKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[a-z][a-z0-9_]*$/, 'Use lowercase letters, numbers, and underscores, starting with a letter');

// Key for a field inside the JSONB blob (CustomFieldDefinition.fieldKey) — camelCase,
// e.g. "warrantyMonths", matching ordinary JS/JSON property naming.
const fieldKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Use letters, numbers, and underscores, starting with a letter');

export const createObjectDefinitionSchema = z.object({
  key: objectKeySchema,
  label: z.string().trim().min(1).max(120),
  pluralLabel: z.string().trim().min(1).max(120),
  icon: z.string().trim().max(8).optional(),
  description: z.string().trim().max(500).optional(),
});

export const updateObjectDefinitionSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  pluralLabel: z.string().trim().min(1).max(120).optional(),
  icon: z.string().trim().max(8).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

const baseFieldSchema = z.object({
  fieldKey: fieldKeySchema,
  label: z.string().trim().min(1).max(120),
  fieldType: fieldTypeEnum,
  options: z.array(z.string().trim().min(1)).optional(),
  isRequired: z.boolean().optional(),
  relationTarget: relationTargetEnum.optional(),
  relationObjectDefinitionId: z.string().uuid().optional(),
  sortOrder: z.number().int().optional(),
});

export const createFieldDefinitionSchema = baseFieldSchema.superRefine((val, ctx) => {
  if (val.fieldType === 'RELATION' && !val.relationTarget) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'relationTarget is required for RELATION fields', path: ['relationTarget'] });
  }
  if (val.relationTarget === 'CUSTOM_OBJECT' && !val.relationObjectDefinitionId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'relationObjectDefinitionId is required when relationTarget is CUSTOM_OBJECT',
      path: ['relationObjectDefinitionId'],
    });
  }
  if ((val.fieldType === 'SELECT' || val.fieldType === 'MULTISELECT') && !(val.options && val.options.length > 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'options is required for SELECT/MULTISELECT fields', path: ['options'] });
  }
});

export const updateFieldDefinitionSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  options: z.array(z.string().trim().min(1)).optional(),
  isRequired: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const upsertRecordSchema = z.object({
  data: z.record(z.unknown()),
});

export type CreateObjectDefinitionInput = z.infer<typeof createObjectDefinitionSchema>;
export type UpdateObjectDefinitionInput = z.infer<typeof updateObjectDefinitionSchema>;
export type CreateFieldDefinitionInput = z.infer<typeof createFieldDefinitionSchema>;
export type UpdateFieldDefinitionInput = z.infer<typeof updateFieldDefinitionSchema>;
export type UpsertRecordInput = z.infer<typeof upsertRecordSchema>;
