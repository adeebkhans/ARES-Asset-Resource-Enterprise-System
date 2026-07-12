import QRCode from 'qrcode';
import { AssetStatus, AssetStatusChangeSource } from '@prisma/client';
import { prisma } from '@/core/database/prisma';
import { ApiError } from '@/core/errors/ApiError';
import { ASSET_TRANSITIONS } from '@/constants/asset-states';
import { assertTransition } from '@/shared/state-machine';
import { eventBus } from '@/core/events';
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

export class AssetService {
  constructor(private readonly repo: AssetRepository = new AssetRepository()) {}

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

    const assetTag = await this.generateUniqueAssetTag(orgId);

    let qrCodeUrl: string | null = null;
    try {
      const qrData = JSON.stringify({ orgId, assetTag });
      qrCodeUrl = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });
    } catch {
      // QR generation failure is non-fatal
    }

    const asset = await this.repo.create({
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
      customFieldValues: input.customFieldValues ?? {},
      qrCodeUrl,
      status: 'AVAILABLE',
    });

    await this.repo.writeStatusHistory({
      assetId: (asset as any).id,
      fromStatus: null,
      toStatus: 'AVAILABLE',
      changedBy: userId,
      source: 'MANUAL',
      reason: 'Asset registered',
    });

    eventBus.emit('asset.registered', {
      assetId: (asset as any).id,
      orgId,
      categoryId: input.categoryId,
    });

    return this.getById(orgId, (asset as any).id);
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
    if (input.customFieldValues !== undefined) data.customFieldValues = input.customFieldValues;

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

  private async generateUniqueAssetTag(orgId: string): Promise<string> {
    const latest = await this.repo.findLatestAssetTag(orgId);
    let sequence = 1;
    if (latest) {
      const match = latest.match(/AF-(\d+)/);
      if (match) sequence = parseInt(match[1], 10) + 1;
    }
    return generateAssetTag(sequence);
  }
}
