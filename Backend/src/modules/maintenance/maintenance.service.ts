import { AssetStatus, MaintenanceStatus } from '@prisma/client';
import { ApiError } from '@/core/errors/ApiError';
import { ASSET_TRANSITIONS } from '@/constants/asset-states';
import { assertTransition } from '@/shared/state-machine';
import { eventBus } from '@/core/events';
import { PaginatedResult, PaginationParams } from '@/types/common.types';
import { MaintenanceRepository, MaintenanceRequestWithAsset } from './maintenance.repository';
import { AssetRepository } from '@/modules/assets/asset.repository';
import {
  CreateMaintenanceRequestInput,
  UpdateMaintenanceStatusInput,
  MaintenanceSearchParams,
} from './maintenance.validators';

export class MaintenanceService {
  constructor(
    private readonly repo: MaintenanceRepository = new MaintenanceRepository(),
    private readonly assetRepo: AssetRepository = new AssetRepository(),
  ) {}

  async list(orgId: string, params: PaginationParams): Promise<PaginatedResult<MaintenanceRequestWithAsset>> {
    return this.repo.search(orgId, { ...params, page: params.page, pageSize: params.pageSize });
  }

  async search(orgId: string, params: MaintenanceSearchParams): Promise<PaginatedResult<MaintenanceRequestWithAsset>> {
    return this.repo.search(orgId, params);
  }

  async getById(orgId: string, id: string): Promise<MaintenanceRequestWithAsset> {
    const request = await this.repo.findById(orgId, id);
    if (!request) throw ApiError.notFound('Maintenance request not found');
    return request;
  }

  async create(orgId: string, input: CreateMaintenanceRequestInput, userId: string): Promise<MaintenanceRequestWithAsset> {
    const asset = await this.assetRepo.findById(orgId, input.assetId);
    if (!asset) throw ApiError.badRequest('Asset not found');

    // Only AVAILABLE or ALLOCATED assets can have maintenance raised
    if (!['AVAILABLE', 'ALLOCATED'].includes(asset.status)) {
      throw ApiError.badRequest(`Cannot raise maintenance for an asset in status "${asset.status}"`);
    }

    const request = await this.repo.create({
      orgId,
      assetId: input.assetId,
      raisedById: userId,
      issueDescription: input.issueDescription,
      priority: input.priority,
      photos: input.photos,
    });

    eventBus.emit('maintenance.raised', {
      maintenanceRequestId: request.id,
      orgId,
      assetId: input.assetId,
      raisedById: userId,
      priority: (input.priority as any) ?? 'MEDIUM',
    });

    return this.getById(orgId, request.id);
  }

  async updateStatus(
    orgId: string,
    id: string,
    input: UpdateMaintenanceStatusInput,
    userId: string,
  ): Promise<MaintenanceRequestWithAsset> {
    const request = await this.repo.findById(orgId, id);
    if (!request) throw ApiError.notFound('Maintenance request not found');

    const fromStatus = request.status;

    // Validate state transition
    this.validateMaintenanceTransition(fromStatus, input.status);

    const updateData: Record<string, unknown> = {
      status: input.status,
    };

    if (input.technicianName !== undefined) updateData.technicianName = input.technicianName;
    if (input.resolutionNotes !== undefined) updateData.resolutionNotes = input.resolutionNotes;
    if (input.status === 'RESOLVED') updateData.resolvedAt = new Date();

    await this.repo.updateStatus(id, updateData as any);

    // Auto-flip asset status based on maintenance status
    await this.handleAssetStatusFlip(request.assetId, input.status, userId);

    eventBus.emit('maintenance.status.changed', {
      maintenanceRequestId: id,
      orgId,
      assetId: request.assetId,
      fromStatus: fromStatus as MaintenanceStatus,
      toStatus: input.status as MaintenanceStatus,
      changedBy: userId,
      resolutionNotes: input.resolutionNotes,
    });

    return this.getById(orgId, id);
  }

  async getStatusCounts(orgId: string) {
    return this.repo.countByStatus(orgId);
  }

  private validateMaintenanceTransition(from: string, to: string): void {
    const validTransitions: Record<string, string[]> = {
      PENDING: ['APPROVED', 'REJECTED'],
      APPROVED: ['IN_PROGRESS', 'REJECTED'],
      IN_PROGRESS: ['RESOLVED'],
      REJECTED: [],
      RESOLVED: [],
    };

    if (!validTransitions[from]?.includes(to)) {
      throw ApiError.invalidStateTransition(
        `Cannot transition maintenance from "${from}" to "${to}"`,
        { from, to },
      );
    }
  }

  private async handleAssetStatusFlip(assetId: string, maintenanceStatus: string, userId: string): Promise<void> {
    const asset = await this.assetRepo.findByIdSimple(assetId);
    if (!asset) return;

    if (maintenanceStatus === 'APPROVED') {
      // Transition asset to UNDER_MAINTENANCE
      const newStatus = assertTransition(ASSET_TRANSITIONS, asset.status, 'approve_maintenance') as AssetStatus;
      await this.assetRepo.update(asset.orgId, assetId, { status: newStatus });
      await this.assetRepo.writeStatusHistory({
        assetId,
        fromStatus: asset.status,
        toStatus: newStatus,
        changedBy: userId,
        source: 'MAINTENANCE',
        reason: 'Maintenance approved',
      });
      eventBus.emit('asset.status.changed', {
        assetId,
        orgId: asset.orgId,
        fromStatus: asset.status,
        toStatus: newStatus,
        changedBy: userId,
        source: 'MAINTENANCE',
        reason: 'Maintenance approved',
      });
    } else if (maintenanceStatus === 'RESOLVED') {
      // Transition asset back to AVAILABLE (from UNDER_MAINTENANCE)
      const newStatus = assertTransition(ASSET_TRANSITIONS, asset.status, 'resolve_maintenance') as AssetStatus;
      await this.assetRepo.update(asset.orgId, assetId, { status: newStatus });
      await this.assetRepo.writeStatusHistory({
        assetId,
        fromStatus: asset.status,
        toStatus: newStatus,
        changedBy: userId,
        source: 'MAINTENANCE',
        reason: 'Maintenance resolved',
      });
      eventBus.emit('asset.status.changed', {
        assetId,
        orgId: asset.orgId,
        fromStatus: asset.status,
        toStatus: newStatus,
        changedBy: userId,
        source: 'MAINTENANCE',
        reason: 'Maintenance resolved',
      });
    }
  }
}
