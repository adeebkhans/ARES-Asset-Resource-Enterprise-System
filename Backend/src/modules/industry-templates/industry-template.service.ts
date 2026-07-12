import { prisma } from '@/core/database/prisma';
import { ApiError } from '@/core/errors/ApiError';
import { CustomObjectRepository } from '@/modules/custom-objects/custom-object.repository';
import { getIndustryTemplate, INDUSTRY_TEMPLATES, TemplateFieldSeed } from './industry-template.definitions';

export interface TemplateSummary {
  tag: string;
  name: string;
  description: string;
  categoryCount: number;
  objectCount: number;
}

export interface ApplyTemplateResult {
  categoriesCreated: string[];
  categoriesSkipped: string[];
  objectsCreated: string[];
  objectsSkipped: string[];
}

export class IndustryTemplateService {
  constructor(private readonly customObjectRepo: CustomObjectRepository = new CustomObjectRepository()) {}

  listTemplates(): TemplateSummary[] {
    return Object.values(INDUSTRY_TEMPLATES).map((t) => ({
      tag: t.tag,
      name: t.name,
      description: t.description,
      categoryCount: t.categories.length,
      objectCount: t.objects.length,
    }));
  }

  /**
   * Applies a template to an org. Idempotent by name/key — re-applying (or
   * applying two overlapping templates) skips anything that already exists
   * instead of throwing, so this is safe to click more than once.
   */
  async applyTemplate(orgId: string, tag: string, appliedBy: string): Promise<ApplyTemplateResult> {
    const template = getIndustryTemplate(tag);
    if (!template) throw ApiError.badRequest(`Unknown industry template: ${tag}`);

    const result: ApplyTemplateResult = {
      categoriesCreated: [],
      categoriesSkipped: [],
      objectsCreated: [],
      objectsSkipped: [],
    };

    // --- Categories (+ Layer 1 fields) ---
    for (const cat of template.categories) {
      const existing = await prisma.assetCategory.findFirst({ where: { orgId, name: cat.name } });
      if (existing) {
        result.categoriesSkipped.push(cat.name);
        continue;
      }

      const created = await prisma.assetCategory.create({
        data: { orgId, name: cat.name, description: cat.description },
      });
      for (const [i, field] of (cat.fields ?? []).entries()) {
        await this.createFieldSafely(orgId, { categoryId: created.id }, 'ASSET_CATEGORY', field, i);
      }
      result.categoriesCreated.push(cat.name);
    }

    // --- Custom objects: definitions first (so relation fields can resolve
    //     sibling object keys -> ids), then fields in a second pass. ---
    const keyToDefinitionId = new Map<string, string>();

    for (const obj of template.objects) {
      const existingDef = await this.customObjectRepo.findDefinitionByKey(orgId, obj.key);
      if (existingDef) {
        keyToDefinitionId.set(obj.key, existingDef.id);
        result.objectsSkipped.push(obj.key);
        continue;
      }

      const created = await this.customObjectRepo.createDefinition({
        orgId,
        key: obj.key,
        label: obj.label,
        pluralLabel: obj.pluralLabel,
        icon: obj.icon,
        description: obj.description,
        createdBy: appliedBy,
      });
      keyToDefinitionId.set(obj.key, created.id);
      result.objectsCreated.push(obj.key);
    }

    for (const obj of template.objects) {
      if (result.objectsSkipped.includes(obj.key)) continue; // pre-existing — assume its fields exist too
      const objectDefinitionId = keyToDefinitionId.get(obj.key);
      if (!objectDefinitionId) continue;

      for (const [i, field] of obj.fields.entries()) {
        const relationObjectDefinitionId = field.relationObjectDefinitionKey
          ? keyToDefinitionId.get(field.relationObjectDefinitionKey)
          : undefined;
        await this.createFieldSafely(orgId, { objectDefinitionId }, 'CUSTOM_OBJECT', field, i, relationObjectDefinitionId);
      }
    }

    return result;
  }

  private async createFieldSafely(
    orgId: string,
    target: { categoryId?: string; objectDefinitionId?: string },
    targetType: 'ASSET_CATEGORY' | 'CUSTOM_OBJECT',
    field: TemplateFieldSeed,
    sortOrder: number,
    relationObjectDefinitionId?: string,
  ): Promise<void> {
    const existing = await this.customObjectRepo.findFieldByKey(orgId, target, field.fieldKey);
    if (existing) return;

    await this.customObjectRepo.createField({
      orgId,
      targetType,
      ...target,
      fieldKey: field.fieldKey,
      label: field.label,
      fieldType: field.fieldType,
      options: field.options ?? [],
      isRequired: field.isRequired ?? false,
      relationTarget: field.relationTarget,
      relationObjectDefinitionId,
      sortOrder,
    });
  }
}
