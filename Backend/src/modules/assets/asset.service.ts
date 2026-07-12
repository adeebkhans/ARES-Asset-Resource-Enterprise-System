import QRCode from 'qrcode';
import { Asset, AssetStatus, AssetStatusChangeSource, Prisma } from '@prisma/client';
import { prisma } from '@/core/database/prisma';
import { ApiError } from '@/core/errors/ApiError';
import { ASSET_TRANSITIONS } from '@/constants/asset-states';
import { assertTransition } from '@/shared/state-machine';
import { eventBus } from '@/core/events';
import { validateCustomValues, validateRelations } from '@/shared/custom-fields';
import { CustomObjectRepository } from '@/modules/custom-objects/custom-object.repository';
import { PaginatedResult, PaginationParams } from '@/types/common.types';
import { AssetRepository, AssetListItem } from './asset.repository';
import {
  CreateAssetInput,
  UpdateAssetInput,
  AssetStatusTransitionInput,
  AssetSearchParams,
} from './asset.validators';

function generateAssetTag(sequence: number): string {
  return `AF-${String(sequence).padStart(4, '0')}`;
}

const MAX_ASSET_TAG_RETRIES = 20;

/** Prisma's unique-constraint violation code, used to detect a concurrent asset-tag collision. */
function isUniqueConstraintViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

export class AssetService {
  constructor(
    private readonly repo: AssetRepository = new AssetRepository(),
    private readonly customObjectRepo: CustomObjectRepository = new CustomObjectRepository(),
  ) {}

  async list(orgId: string, params: PaginationParams): Promise<PaginatedResult<AssetListItem>> {
    return this.repo.search(orgId, { ...params, page: params.page, pageSize: params.pageSize });
  }

  async search(orgId: string, params: AssetSearchParams): Promise<PaginatedResult<AssetListItem>> {
    return this.repo.search(orgId, params);
  }

  async getById(orgId: string, id: string) {
    const asset = await this.repo.findByIdWithCategory(orgId, id);
    if (!asset) throw ApiError.notFound('Asset not found');
    return asset;
  }

  async create(orgId: string, input: CreateAssetInput, userId: string) {
    const cat = await prisma.assetCategory.findFirst({
      where: { id: input.categoryId, orgId },
    });
    if (!cat) throw ApiError.badRequest('Asset category not found');

    // Layer 1 of the Configurable Object Framework (plan.md §7.1): the category's
    // admin-defined fields (e.g. "warrantyMonths" on Electronics) are validated
    // here — the schema is metadata, not code, so this stays correct as fields change.
    const categoryFields = await this.customObjectRepo.listFieldsForCategory(orgId, input.categoryId);
    const customFieldValues = validateCustomValues(categoryFields, input.customFieldValues);
    await validateRelations(orgId, categoryFields, customFieldValues);

    const asset = await this.createWithUniqueTag(orgId, input, customFieldValues);

    let qrCodeUrl: string | null = null;
    try {
      const qrData = JSON.stringify({ orgId, assetTag: asset.assetTag });
      qrCodeUrl = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });
      await this.repo.update(orgId, asset.id, { qrCodeUrl });
    } catch {
      // QR generation/persist failure is non-fatal — the asset still registers, just without a QR code yet.
    }

    await this.repo.writeStatusHistory({
      assetId: asset.id,
      fromStatus: null,
      toStatus: 'AVAILABLE',
      changedBy: userId,
      source: 'MANUAL',
      reason: 'Asset registered',
    });

    eventBus.emit('asset.registered', {
      assetId: asset.id,
      orgId,
      categoryId: input.categoryId,
      registeredBy: userId,
    });

    return this.getById(orgId, asset.id);
  }

  /**
   * Two concurrent registrations can both read the same "next" tag before
   * either writes. Rather than lock, retry on a unique-constraint conflict —
   * but re-reading MAX on every retry would just make every racing request
   * converge on the same contested number again. Instead, read MAX once and
   * then probe forward locally (seq, seq+1, seq+2, ...) so each retry within
   * a request always targets a number none of its own attempts has tried yet.
   */
  private async createWithUniqueTag(
    orgId: string,
    input: CreateAssetInput,
    customFieldValues: Record<string, unknown>,
  ): Promise<Asset> {
    let sequence = (await this.repo.findMaxAssetTagSequence(orgId)) + 1;

    for (let attempt = 0; attempt < MAX_ASSET_TAG_RETRIES; attempt++) {
      const assetTag = generateAssetTag(sequence);
      try {
        return await this.repo.create({
          orgId,
          assetTag,
          name: input.name,
          categoryId: input.categoryId,
          serialNumber: input.serialNumber ?? null,
          acquisitionDate: input.acquisitionDate ? new Date(input.acquisitionDate) : null,
          acquisitionCost: input.acquisitionCost ?? null,
          condition: input.condition ?? null,
          location: input.location ?? null,
          isShared: input.isShared ?? false,
          customFieldValues,
          qrCodeUrl: null,
          status: 'AVAILABLE',
        });
      } catch (err) {
        if (isUniqueConstraintViolation(err) && attempt < MAX_ASSET_TAG_RETRIES - 1) {
          sequence += 1;
          continue;
        }
        throw err;
      }
    }
    throw ApiError.internal('Could not generate a unique asset tag — please retry');
  }

  async update(orgId: string, id: string, input: UpdateAssetInput) {
    const existing = await this.repo.findById(orgId, id);
    if (!existing) throw ApiError.notFound('Asset not found');

    if (input.categoryId) {
      const cat = await prisma.assetCategory.findFirst({
        where: { id: input.categoryId, orgId },
      });
      if (!cat) throw ApiError.badRequest('Asset category not found');
    }

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.categoryId !== undefined) data.categoryId = input.categoryId;
    if (input.serialNumber !== undefined) data.serialNumber = input.serialNumber;
    if (input.acquisitionDate !== undefined) data.acquisitionDate = input.acquisitionDate ? new Date(input.acquisitionDate) : null;
    if (input.acquisitionCost !== undefined) data.acquisitionCost = input.acquisitionCost;
    if (input.condition !== undefined) data.condition = input.condition;
    if (input.location !== undefined) data.location = input.location;
    if (input.isShared !== undefined) data.isShared = input.isShared;

    if (input.customFieldValues !== undefined) {
      // Validate against whichever category will be effective after this update.
      const effectiveCategoryId = input.categoryId ?? existing.categoryId;
      const categoryFields = await this.customObjectRepo.listFieldsForCategory(orgId, effectiveCategoryId);
      const customFieldValues = validateCustomValues(categoryFields, input.customFieldValues);
      await validateRelations(orgId, categoryFields, customFieldValues);
      data.customFieldValues = customFieldValues;
    }

    if (Object.keys(data).length > 0) {
      await this.repo.update(orgId, id, data);
    }

    return this.getById(orgId, id);
  }

  async transitionStatus(orgId: string, id: string, input: AssetStatusTransitionInput, userId: string) {
    const asset = await this.repo.findById(orgId, id);
    if (!asset) throw ApiError.notFound('Asset not found');

    const newStatus = assertTransition(ASSET_TRANSITIONS, asset.status, input.event) as AssetStatus;

    await this.repo.update(orgId, id, { status: newStatus });

    await this.repo.writeStatusHistory({
      assetId: id,
      fromStatus: asset.status,
      toStatus: newStatus,
      changedBy: userId,
      source: (input.source as AssetStatusChangeSource) ?? 'MANUAL',
      reason: input.reason,
    });

    eventBus.emit('asset.status.changed', {
      assetId: id,
      orgId,
      fromStatus: asset.status,
      toStatus: newStatus,
      changedBy: userId,
      source: (input.source as AssetStatusChangeSource) ?? 'MANUAL',
      reason: input.reason,
    });

    return this.getById(orgId, id);
  }

  async getStatusCounts(orgId: string) {
    return this.repo.countByStatus(orgId);
  }
}
