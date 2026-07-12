import { CustomFieldDefinition, CustomObjectDefinition, CustomObjectRecord, Prisma } from '@prisma/client';
import { prisma } from '@/core/database/prisma';
import { PaginatedResult, PaginationParams } from '@/types/common.types';
import { buildPaginatedResult, toSkipTake } from '@/utils/pagination';

export type ObjectDefinitionWithCount = CustomObjectDefinition & { _count: { records: number } };

export class CustomObjectRepository {
  // --- Definitions -----------------------------------------------------

  async listDefinitions(orgId: string): Promise<ObjectDefinitionWithCount[]> {
    return prisma.customObjectDefinition.findMany({
      where: { orgId },
      orderBy: { label: 'asc' },
      include: { _count: { select: { records: true } } },
    });
  }

  async findDefinitionById(orgId: string, id: string): Promise<CustomObjectDefinition | null> {
    return prisma.customObjectDefinition.findFirst({ where: { id, orgId } });
  }

  async findDefinitionByKey(orgId: string, key: string): Promise<CustomObjectDefinition | null> {
    return prisma.customObjectDefinition.findFirst({ where: { orgId, key } });
  }

  async createDefinition(data: {
    orgId: string;
    key: string;
    label: string;
    pluralLabel: string;
    icon?: string;
    description?: string;
    createdBy: string;
  }): Promise<CustomObjectDefinition> {
    return prisma.customObjectDefinition.create({ data });
  }

  async updateDefinition(id: string, data: Record<string, unknown>): Promise<CustomObjectDefinition> {
    return prisma.customObjectDefinition.update({ where: { id }, data });
  }

  async deleteDefinition(id: string): Promise<void> {
    await prisma.customObjectDefinition.delete({ where: { id } });
  }

  // --- Field definitions -------------------------------------------------

  async listFieldsForCategory(orgId: string, categoryId: string): Promise<CustomFieldDefinition[]> {
    return prisma.customFieldDefinition.findMany({
      where: { orgId, categoryId, targetType: 'ASSET_CATEGORY' },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async listFieldsForObject(orgId: string, objectDefinitionId: string): Promise<CustomFieldDefinition[]> {
    return prisma.customFieldDefinition.findMany({
      where: { orgId, objectDefinitionId, targetType: 'CUSTOM_OBJECT' },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findFieldById(orgId: string, id: string): Promise<CustomFieldDefinition | null> {
    return prisma.customFieldDefinition.findFirst({ where: { id, orgId } });
  }

  async findFieldByKey(
    orgId: string,
    target: { categoryId?: string; objectDefinitionId?: string },
    fieldKey: string,
  ): Promise<CustomFieldDefinition | null> {
    return prisma.customFieldDefinition.findFirst({
      where: { orgId, fieldKey, ...target },
    });
  }

  async createField(data: {
    orgId: string;
    targetType: 'ASSET_CATEGORY' | 'CUSTOM_OBJECT';
    categoryId?: string;
    objectDefinitionId?: string;
    fieldKey: string;
    label: string;
    fieldType: CustomFieldDefinition['fieldType'];
    options?: string[];
    isRequired?: boolean;
    relationTarget?: CustomFieldDefinition['relationTarget'];
    relationObjectDefinitionId?: string;
    sortOrder?: number;
  }): Promise<CustomFieldDefinition> {
    return prisma.customFieldDefinition.create({ data });
  }

  async updateField(id: string, data: Record<string, unknown>): Promise<CustomFieldDefinition> {
    return prisma.customFieldDefinition.update({ where: { id }, data });
  }

  async deleteField(id: string): Promise<void> {
    await prisma.customFieldDefinition.delete({ where: { id } });
  }

  // --- Records ------------------------------------------------------------

  async listRecords(
    orgId: string,
    objectDefinitionId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<CustomObjectRecord>> {
    const { skip, take } = toSkipTake(params);
    const where = { orgId, objectDefinitionId };
    const [items, total] = await Promise.all([
      prisma.customObjectRecord.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.customObjectRecord.count({ where }),
    ]);
    return buildPaginatedResult(items, total, params);
  }

  async findRecordById(orgId: string, id: string): Promise<CustomObjectRecord | null> {
    return prisma.customObjectRecord.findFirst({ where: { id, orgId } });
  }

  async createRecord(data: {
    orgId: string;
    objectDefinitionId: string;
    data: Record<string, unknown>;
    createdBy: string;
  }): Promise<CustomObjectRecord> {
    return prisma.customObjectRecord.create({
      data: { ...data, data: data.data as Prisma.InputJsonValue },
    });
  }

  async updateRecord(id: string, data: Record<string, unknown>): Promise<CustomObjectRecord> {
    return prisma.customObjectRecord.update({
      where: { id },
      data: { data: data as Prisma.InputJsonValue },
    });
  }

  async deleteRecord(id: string): Promise<void> {
    await prisma.customObjectRecord.delete({ where: { id } });
  }
}
