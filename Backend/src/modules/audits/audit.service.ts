import { ApiError } from '@/core/errors/ApiError';
import { eventBus } from '@/core/events';
import { PaginatedResult, PaginationParams } from '@/types/common.types';
import { AuditRepository, AuditCycleWithDetails } from './audit.repository';
import { AssetRepository } from '@/modules/assets/asset.repository';
import {
  CreateAuditCycleInput,
  UpdateAuditCycleInput,
  SubmitAuditRecordInput,
  AuditSearchParams,
} from './audit.validators';

export class AuditService {
  constructor(
    private readonly repo: AuditRepository = new AuditRepository(),
    private readonly assetRepo: AssetRepository = new AssetRepository(),
  ) {}

  async list(orgId: string, params: PaginationParams): Promise<PaginatedResult<AuditCycleWithDetails>> {
    return this.repo.search(orgId, { ...params, page: params.page, pageSize: params.pageSize });
  }

  async search(orgId: string, params: AuditSearchParams): Promise<PaginatedResult<AuditCycleWithDetails>> {
    return this.repo.search(orgId, params);
  }

  async getById(orgId: string, id: string): Promise<AuditCycleWithDetails> {
    const cycle = await this.repo.findById(orgId, id);
    if (!cycle) throw ApiError.notFound('Audit cycle not found');
    return cycle;
  }

  async create(orgId: string, input: CreateAuditCycleInput, userId: string): Promise<AuditCycleWithDetails> {
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (endDate <= startDate) {
      throw ApiError.badRequest('End date must be after start date');
    }

    if (input.scopeDepartmentId) {
      const { prisma } = await import('@/core/database/prisma');
      const dept = await prisma.department.findFirst({
        where: { id: input.scopeDepartmentId, orgId },
      });
      if (!dept) throw ApiError.badRequest('Scope department not found');
    }

    // Validate all auditor user IDs belong to the same org
    const { prisma } = await import('@/core/database/prisma');
    const validUsers = await prisma.user.findMany({
      where: { id: { in: input.auditorUserIds }, orgId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (validUsers.length !== input.auditorUserIds.length) {
      throw ApiError.badRequest('One or more auditor user IDs are invalid or inactive');
    }

    const cycle = await this.repo.create({
      orgId,
      scopeDepartmentId: input.scopeDepartmentId,
      scopeLocation: input.scopeLocation,
      startDate,
      endDate,
      createdBy: userId,
    });

    await this.repo.addAssignments(cycle.id, input.auditorUserIds);

    eventBus.emit('audit.cycle.created', {
      auditCycleId: cycle.id,
      orgId,
      createdBy: userId,
      startDate,
      endDate,
    });

    return this.getById(orgId, cycle.id);
  }

  async updateStatus(orgId: string, id: string, input: UpdateAuditCycleInput, userId: string): Promise<AuditCycleWithDetails> {
    const cycle = await this.repo.findById(orgId, id);
    if (!cycle) throw ApiError.notFound('Audit cycle not found');

    this.validateCycleTransition(cycle.status, input.status);

    await this.repo.updateStatus(id, input.status);

    // On close, auto-generate discrepancy report for non-verified items
    if (input.status === 'CLOSED') {
      const missingAssets = await this.repo.getMissingAssets(id);
      const discrepancyCount = missingAssets.length;

      if (discrepancyCount > 0) {
        const summary = {
          missing: missingAssets.filter((r) => r.result === 'MISSING').map((r) => ({
            assetId: r.asset.id,
            assetTag: r.asset.assetTag,
            name: r.asset.name,
            location: r.asset.location,
            status: r.asset.status,
          })),
          damaged: missingAssets.filter((r) => r.result === 'DAMAGED').map((r) => ({
            assetId: r.asset.id,
            assetTag: r.asset.assetTag,
            name: r.asset.name,
            location: r.asset.location,
            status: r.asset.status,
          })),
        };

        await this.repo.createDiscrepancyReport(id, discrepancyCount, summary);

        // Transition missing assets to LOST status
        for (const record of missingAssets.filter((r) => r.result === 'MISSING')) {
          try {
            const asset = await this.assetRepo.findByIdSimple(record.asset.id);
            if (asset && asset.status !== 'LOST' && asset.status !== 'DISPOSED') {
              await this.assetRepo.update(asset.orgId, asset.id, { status: 'LOST' });
              await this.assetRepo.writeStatusHistory({
                assetId: asset.id,
                fromStatus: asset.status,
                toStatus: 'LOST',
                changedBy: userId,
                source: 'AUDIT',
                reason: `Audit cycle ${id} — marked as MISSING`,
              });
              eventBus.emit('asset.status.changed', {
                assetId: asset.id,
                orgId: asset.orgId,
                fromStatus: asset.status,
                toStatus: 'LOST',
                changedBy: userId,
                source: 'AUDIT',
                reason: `Audit cycle ${id} — marked as MISSING`,
              });
            }
          } catch {
            // If a specific asset transition fails (e.g. already disposed), skip it
          }
        }
      }

      eventBus.emit('audit.cycle.closed', {
        auditCycleId: id,
        orgId,
        closedBy: userId,
        discrepancyCount,
      });
    }

    return this.getById(orgId, id);
  }

  async submitRecord(
    orgId: string,
    cycleId: string,
    input: SubmitAuditRecordInput,
    userId: string,
  ) {
    const cycle = await this.repo.findById(orgId, cycleId);
    if (!cycle) throw ApiError.notFound('Audit cycle not found');

    if (cycle.status === 'CLOSED') {
      throw ApiError.badRequest('Cannot submit records to a closed audit cycle');
    }

    // Verify the asset exists and belongs to this org
    const asset = await this.assetRepo.findById(orgId, input.assetId);
    if (!asset) throw ApiError.badRequest('Asset not found');

    // Verify the user is assigned to this audit cycle
    const isAssigned = cycle.assignments?.some((a) => a.auditor.id === userId);
    if (!isAssigned && cycle.createdBy !== userId) {
      throw ApiError.forbidden('You are not assigned to this audit cycle');
    }

    const record = await this.repo.addRecord({
      auditCycleId: cycleId,
      assetId: input.assetId,
      result: input.result,
      notes: input.notes,
      auditedById: userId,
    });

    eventBus.emit('audit.record.submitted', {
      auditRecordId: record.id,
      auditCycleId: cycleId,
      orgId,
      assetId: input.assetId,
      result: input.result as any,
      auditedBy: userId,
    });

    return record;
  }

  async getRecords(orgId: string, cycleId: string) {
    const cycle = await this.repo.findById(orgId, cycleId);
    if (!cycle) throw ApiError.notFound('Audit cycle not found');
    return this.repo.getRecords(cycleId);
  }

  async getAssignedCycles(userId: string) {
    return this.repo.getAssignedCycles(userId);
  }

  async getStatusCounts(orgId: string) {
    return this.repo.countByStatus(orgId);
  }

  private validateCycleTransition(from: string, to: string): void {
    const validTransitions: Record<string, string[]> = {
      PLANNED: ['IN_PROGRESS'],
      IN_PROGRESS: ['CLOSED'],
      CLOSED: [],
    };

    if (!validTransitions[from]?.includes(to)) {
      throw ApiError.invalidStateTransition(
        `Cannot transition audit cycle from "${from}" to "${to}"`,
        { from, to },
      );
    }
  }
}
