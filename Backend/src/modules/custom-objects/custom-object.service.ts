import { CustomFieldDefinition, CustomObjectDefinition, CustomObjectRecord } from '@prisma/client';
import { ApiError } from '@/core/errors/ApiError';
import { prisma } from '@/core/database/prisma';
import { eventBus } from '@/core/events';
import { PaginatedResult, PaginationParams } from '@/types/common.types';
import { validateCustomValues, validateRelations } from '@/shared/custom-fields';
import { CustomObjectRepository, ObjectDefinitionWithCount } from './custom-object.repository';
import {
  CreateFieldDefinitionInput,
  CreateObjectDefinitionInput,
  UpdateFieldDefinitionInput,
  UpdateObjectDefinitionInput,
} from './custom-object.validators';

export class CustomObjectService {
  constructor(private readonly repo: CustomObjectRepository = new CustomObjectRepository()) {}

  // --- Definitions -----------------------------------------------------

  async listDefinitions(orgId: string): Promise<ObjectDefinitionWithCount[]> {
    return this.repo.listDefinitions(orgId);
  }

  async getDefinition(orgId: string, id: string): Promise<CustomObjectDefinition> {
    const def = await this.repo.findDefinitionById(orgId, id);
    if (!def) throw ApiError.notFound('Custom object not found');
    return def;
  }

  async createDefinition(
    orgId: string,
    input: CreateObjectDefinitionInput,
    createdBy: string,
  ): Promise<CustomObjectDefinition> {
    const existing = await this.repo.findDefinitionByKey(orgId, input.key);
    if (existing) throw ApiError.conflict(`A custom object with key "${input.key}" already exists`);

    return this.repo.createDefinition({
      orgId,
      key: input.key,
      label: input.label,
      pluralLabel: input.pluralLabel,
      icon: input.icon,
      description: input.description,
      createdBy,
    });
  }

  async updateDefinition(
    orgId: string,
    id: string,
    input: UpdateObjectDefinitionInput,
  ): Promise<CustomObjectDefinition> {
    await this.getDefinition(orgId, id);
    const data: Record<string, unknown> = {};
    if (input.label !== undefined) data.label = input.label;
    if (input.pluralLabel !== undefined) data.pluralLabel = input.pluralLabel;
    if (input.icon !== undefined) data.icon = input.icon;
    if (input.description !== undefined) data.description = input.description;
    if (Object.keys(data).length > 0) {
      await this.repo.updateDefinition(id, data);
    }
    return this.getDefinition(orgId, id);
  }

  async deleteDefinition(orgId: string, id: string): Promise<void> {
    await this.getDefinition(orgId, id);
    const recordCount = await prisma.customObjectRecord.count({ where: { objectDefinitionId: id } });
    if (recordCount > 0) {
      throw ApiError.badRequest('Cannot delete a custom object that still has records. Delete its records first.');
    }
    await this.repo.deleteDefinition(id);
  }

  // --- Field definitions (Layer 1 & Layer 2, plan.md §7.1) ---------------

  async listFieldsForCategory(orgId: string, categoryId: string): Promise<CustomFieldDefinition[]> {
    return this.repo.listFieldsForCategory(orgId, categoryId);
  }

  async listFieldsForObject(orgId: string, objectDefinitionId: string): Promise<CustomFieldDefinition[]> {
    await this.getDefinition(orgId, objectDefinitionId);
    return this.repo.listFieldsForObject(orgId, objectDefinitionId);
  }

  async createFieldForCategory(
    orgId: string,
    categoryId: string,
    input: CreateFieldDefinitionInput,
  ): Promise<CustomFieldDefinition> {
    const category = await prisma.assetCategory.findFirst({ where: { id: categoryId, orgId } });
    if (!category) throw ApiError.notFound('Asset category not found');
    return this.createField(orgId, { categoryId }, 'ASSET_CATEGORY', input);
  }

  async createFieldForObject(
    orgId: string,
    objectDefinitionId: string,
    input: CreateFieldDefinitionInput,
  ): Promise<CustomFieldDefinition> {
    await this.getDefinition(orgId, objectDefinitionId);
    return this.createField(orgId, { objectDefinitionId }, 'CUSTOM_OBJECT', input);
  }

  private async createField(
    orgId: string,
    target: { categoryId?: string; objectDefinitionId?: string },
    targetType: 'ASSET_CATEGORY' | 'CUSTOM_OBJECT',
    input: CreateFieldDefinitionInput,
  ): Promise<CustomFieldDefinition> {
    const existing = await this.repo.findFieldByKey(orgId, target, input.fieldKey);
    if (existing) {
      throw ApiError.conflict(`A field with key "${input.fieldKey}" already exists on this target`);
    }

    if (input.relationTarget === 'CUSTOM_OBJECT' && input.relationObjectDefinitionId) {
      const relatedDef = await this.repo.findDefinitionById(orgId, input.relationObjectDefinitionId);
      if (!relatedDef) throw ApiError.badRequest('relationObjectDefinitionId does not point to an existing custom object');
    }

    return this.repo.createField({
      orgId,
      targetType,
      ...target,
      fieldKey: input.fieldKey,
      label: input.label,
      fieldType: input.fieldType,
      options: input.options ?? [],
      isRequired: input.isRequired ?? false,
      relationTarget: input.relationTarget,
      relationObjectDefinitionId: input.relationObjectDefinitionId,
      sortOrder: input.sortOrder ?? 0,
    });
  }

  async updateField(orgId: string, id: string, input: UpdateFieldDefinitionInput): Promise<CustomFieldDefinition> {
    const existing = await this.repo.findFieldById(orgId, id);
    if (!existing) throw ApiError.notFound('Field definition not found');

    const data: Record<string, unknown> = {};
    if (input.label !== undefined) data.label = input.label;
    if (input.options !== undefined) data.options = input.options;
    if (input.isRequired !== undefined) data.isRequired = input.isRequired;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

    return this.repo.updateField(id, data);
  }

  async deleteField(orgId: string, id: string): Promise<void> {
    const existing = await this.repo.findFieldById(orgId, id);
    if (!existing) throw ApiError.notFound('Field definition not found');
    await this.repo.deleteField(id);
  }

  // --- Records --------------------------------------------------------

  async listRecords(
    orgId: string,
    objectDefinitionId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<CustomObjectRecord>> {
    await this.getDefinition(orgId, objectDefinitionId);
    return this.repo.listRecords(orgId, objectDefinitionId, params);
  }

  async getRecord(orgId: string, id: string): Promise<CustomObjectRecord> {
    const record = await this.repo.findRecordById(orgId, id);
    if (!record) throw ApiError.notFound('Record not found');
    return record;
  }

  async createRecord(
    orgId: string,
    objectDefinitionId: string,
    rawValues: unknown,
    createdBy: string,
  ): Promise<CustomObjectRecord> {
    const definition = await this.getDefinition(orgId, objectDefinitionId);
    const fields = await this.repo.listFieldsForObject(orgId, objectDefinitionId);

    const values = validateCustomValues(fields, rawValues);
    await validateRelations(orgId, fields, values);

    const record = await this.repo.createRecord({ orgId, objectDefinitionId, data: values, createdBy });

    eventBus.emit('custom-object.record.created', {
      orgId,
      recordId: record.id,
      objectDefinitionId,
      objectKey: definition.key,
      createdBy,
    });

    return record;
  }

  async updateRecord(
    orgId: string,
    id: string,
    rawValues: unknown,
    updatedBy: string,
  ): Promise<CustomObjectRecord> {
    const existing = await this.getRecord(orgId, id);
    const definition = await this.getDefinition(orgId, existing.objectDefinitionId);
    const fields = await this.repo.listFieldsForObject(orgId, existing.objectDefinitionId);

    const values = validateCustomValues(fields, rawValues);
    await validateRelations(orgId, fields, values);

    const record = await this.repo.updateRecord(id, values);

    eventBus.emit('custom-object.record.updated', {
      orgId,
      recordId: id,
      objectDefinitionId: existing.objectDefinitionId,
      objectKey: definition.key,
      updatedBy,
    });

    return record;
  }

  async deleteRecord(orgId: string, id: string, deletedBy: string): Promise<void> {
    const existing = await this.getRecord(orgId, id);
    const definition = await this.getDefinition(orgId, existing.objectDefinitionId);
    await this.repo.deleteRecord(id);

    eventBus.emit('custom-object.record.deleted', {
      orgId,
      recordId: id,
      objectDefinitionId: existing.objectDefinitionId,
      objectKey: definition.key,
      deletedBy,
    });
  }
}
