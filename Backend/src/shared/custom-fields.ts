import { CustomFieldDefinition } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/core/database/prisma';
import { ApiError } from '@/core/errors/ApiError';

/**
 * Runtime Zod-schema builder for the Configurable Object Framework (plan.md §7.3).
 *
 * Field definitions are rows, not code — so the validation schema is rebuilt
 * from the current definitions on every write. No code generation, no redeploy
 * when an Admin adds a field. Used by BOTH consumers of custom fields:
 * asset registration (category fields) and custom object records.
 */

function schemaForField(def: CustomFieldDefinition): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (def.fieldType) {
    case 'TEXT':
      schema = z.string().trim().max(2000);
      break;
    case 'NUMBER':
      schema = z.number().finite();
      break;
    case 'DATE':
      // Stored as ISO string inside JSONB; calendar dates and full timestamps both accepted.
      schema = z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date');
      break;
    case 'BOOLEAN':
      schema = z.boolean();
      break;
    case 'SELECT': {
      const options = (def.options as string[]) ?? [];
      schema = options.length > 0 ? z.enum(options as [string, ...string[]]) : z.string();
      break;
    }
    case 'MULTISELECT': {
      const options = (def.options as string[]) ?? [];
      const item = options.length > 0 ? z.enum(options as [string, ...string[]]) : z.string();
      schema = z.array(item);
      break;
    }
    case 'RELATION':
      // Existence of the referenced row is checked separately (async) in validateRelations.
      schema = z.string().uuid();
      break;
  }

  if (!def.isRequired) {
    // Absent, null, and empty-string all mean "not provided" for optional fields.
    schema = z
      .union([schema, z.null(), z.literal('')])
      .optional()
      .transform((v) => (v === '' || v === null ? undefined : v));
  }

  return schema;
}

/** Builds a strict object schema — unknown keys are rejected, not silently stored. */
export function buildValuesSchema(defs: CustomFieldDefinition[]): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const def of defs) {
    shape[def.fieldKey] = schemaForField(def);
  }
  return z.object(shape).strict();
}

/**
 * Validates raw JSONB payload against the field definitions. Returns the
 * parsed (coerced/cleaned) values. Throws ApiError 400 with per-field details.
 */
export function validateCustomValues(
  defs: CustomFieldDefinition[],
  raw: unknown,
): Record<string, unknown> {
  const parsed = buildValuesSchema(defs).safeParse(raw ?? {});
  if (!parsed.success) {
    throw ApiError.badRequest('Custom field validation failed', parsed.error.flatten());
  }
  // Drop keys whose value resolved to undefined so the stored JSONB stays compact.
  const values = parsed.data as Record<string, unknown>;
  for (const key of Object.keys(values)) {
    if (values[key] === undefined) delete values[key];
  }
  return values;
}

/**
 * Async pass for RELATION fields: confirms every referenced row exists and
 * belongs to the same org. Runs after the sync schema pass so all ids are
 * already known to be well-formed UUIDs.
 */
export async function validateRelations(
  orgId: string,
  defs: CustomFieldDefinition[],
  values: Record<string, unknown>,
): Promise<void> {
  for (const def of defs) {
    if (def.fieldType !== 'RELATION') continue;
    const id = values[def.fieldKey];
    if (typeof id !== 'string') continue; // optional + not provided

    let exists = false;
    switch (def.relationTarget) {
      case 'ASSET':
        exists = !!(await prisma.asset.findFirst({ where: { id, orgId }, select: { id: true } }));
        break;
      case 'USER':
        exists = !!(await prisma.user.findFirst({ where: { id, orgId }, select: { id: true } }));
        break;
      case 'DEPARTMENT':
        exists = !!(await prisma.department.findFirst({ where: { id, orgId }, select: { id: true } }));
        break;
      case 'CUSTOM_OBJECT':
        exists = !!(await prisma.customObjectRecord.findFirst({
          where: { id, orgId, objectDefinitionId: def.relationObjectDefinitionId ?? undefined },
          select: { id: true },
        }));
        break;
      default:
        break;
    }

    if (!exists) {
      throw ApiError.badRequest(`Related record not found for field "${def.label}"`, {
        fieldKey: def.fieldKey,
        relationTarget: def.relationTarget,
      });
    }
  }
}
