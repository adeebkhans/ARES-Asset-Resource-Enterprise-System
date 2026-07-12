import { z } from 'zod';
import type { CustomFieldDefinition } from '@/types/domain.types';

/**
 * Builds an RHF-compatible Zod schema from field metadata at render time — the
 * frontend half of the Configurable Object Framework (plan.md §7.3/§7.4).
 * Mirrors Backend/src/shared/custom-fields.ts field-by-field; the server is
 * still the source of truth (this only gives the user fast feedback).
 */
function schemaForField(def: CustomFieldDefinition): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (def.fieldType) {
    case 'TEXT':
      schema = z.string().trim();
      break;
    case 'NUMBER':
      schema = z.coerce.number({ message: `${def.label} must be a number` });
      break;
    case 'DATE':
      schema = z.string().min(1, `${def.label} is required`);
      break;
    case 'BOOLEAN':
      schema = z.boolean();
      break;
    case 'SELECT':
      schema = def.options.length > 0 ? z.enum(def.options as [string, ...string[]]) : z.string();
      break;
    case 'MULTISELECT':
      schema = z.array(z.string());
      break;
    case 'RELATION':
      schema = z.string().uuid(`${def.label} is required`);
      break;
  }

  if (!def.isRequired) {
    schema = z
      .union([schema, z.literal(''), z.undefined()])
      .optional()
      .transform((v) => (v === '' || v === undefined ? undefined : v));
  } else if (def.fieldType === 'TEXT' || def.fieldType === 'SELECT' || def.fieldType === 'RELATION') {
    schema = (schema as z.ZodString).min(1, `${def.label} is required`);
  }

  return schema;
}

export function buildFieldsSchema(defs: CustomFieldDefinition[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const def of defs) {
    shape[def.fieldKey] = schemaForField(def);
  }
  return z.object(shape);
}

/** Sensible per-type default so every registered field has a controlled initial value. */
export function defaultValuesForFields(defs: CustomFieldDefinition[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const def of defs) {
    switch (def.fieldType) {
      case 'BOOLEAN':
        values[def.fieldKey] = false;
        break;
      case 'MULTISELECT':
        values[def.fieldKey] = [];
        break;
      default:
        values[def.fieldKey] = '';
    }
  }
  return values;
}
