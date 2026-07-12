import { eventBus } from '@/core/events';
import { logger } from '@/config/logger';
import { ActivityLogService } from './activity-log.service';

const service = new ActivityLogService();

/**
 * Wire domain events to activity log entries (plan.md §5.4).
 * Every service-layer mutation emits an event; this listener writes the
 * corresponding ActivityLog row — never ad-hoc from controllers.
 */
export function registerActivityLogListeners(): void {
  eventBus.on('asset.registered', async (payload) => {
    await service.log({
      orgId: payload.orgId,
      userId: payload.registeredBy,
      action: 'asset.registered',
      entityType: 'Asset',
      entityId: payload.assetId,
      metadata: { categoryId: payload.categoryId },
    });
  });

  eventBus.on('asset.status.changed', async (payload) => {
    await service.log({
      orgId: payload.orgId,
      userId: payload.changedBy ?? 'system',
      action: 'asset.status.changed',
      entityType: 'Asset',
      entityId: payload.assetId,
      metadata: {
        fromStatus: payload.fromStatus,
        toStatus: payload.toStatus,
        source: payload.source,
        reason: payload.reason,
      },
    });
  });

  eventBus.on('user.registered', async (payload) => {
    await service.log({
      orgId: payload.orgId,
      userId: payload.userId,
      action: 'user.registered',
      entityType: 'User',
      entityId: payload.userId,
      metadata: { email: payload.email },
    });
  });

  // Phase 3 — Maintenance
  eventBus.on('maintenance.raised', async (payload) => {
    await service.log({
      orgId: payload.orgId,
      userId: payload.raisedById,
      action: 'maintenance.raised',
      entityType: 'MaintenanceRequest',
      entityId: payload.maintenanceRequestId,
      metadata: { assetId: payload.assetId, priority: payload.priority },
    });
  });

  eventBus.on('maintenance.status.changed', async (payload) => {
    await service.log({
      orgId: payload.orgId,
      userId: payload.changedBy,
      action: 'maintenance.status.changed',
      entityType: 'MaintenanceRequest',
      entityId: payload.maintenanceRequestId,
      metadata: {
        fromStatus: payload.fromStatus,
        toStatus: payload.toStatus,
        assetId: payload.assetId,
      },
    });
  });

  // Phase 3 — Audits
  eventBus.on('audit.cycle.created', async (payload) => {
    await service.log({
      orgId: payload.orgId,
      userId: payload.createdBy,
      action: 'audit.cycle.created',
      entityType: 'AuditCycle',
      entityId: payload.auditCycleId,
      metadata: { startDate: payload.startDate, endDate: payload.endDate },
    });
  });

  eventBus.on('audit.cycle.closed', async (payload) => {
    await service.log({
      orgId: payload.orgId,
      userId: payload.closedBy,
      action: 'audit.cycle.closed',
      entityType: 'AuditCycle',
      entityId: payload.auditCycleId,
      metadata: { discrepancyCount: payload.discrepancyCount },
    });
  });

  eventBus.on('audit.record.submitted', async (payload) => {
    await service.log({
      orgId: payload.orgId,
      userId: payload.auditedBy,
      action: 'audit.record.submitted',
      entityType: 'AuditRecord',
      entityId: payload.auditRecordId,
      metadata: { assetId: payload.assetId, result: payload.result, auditCycleId: payload.auditCycleId },
    });
  });

  // Phase 4 — Approvals
  eventBus.on('approval.requested', async (payload) => {
    await service.log({
      orgId: payload.orgId,
      userId: payload.requestedById,
      action: 'approval.requested',
      entityType: payload.entityType,
      entityId: payload.entityId,
      metadata: { type: payload.type, approvalId: payload.approvalId, dueAt: payload.dueAt },
    });
  });

  eventBus.on('approval.approved', async (payload) => {
    await service.log({
      orgId: payload.orgId,
      userId: payload.decidedById,
      action: 'approval.approved',
      entityType: payload.entityType,
      entityId: payload.entityId,
      metadata: { type: payload.type, approvalId: payload.approvalId, comment: payload.comment },
    });
  });

  eventBus.on('approval.rejected', async (payload) => {
    await service.log({
      orgId: payload.orgId,
      userId: payload.decidedById,
      action: 'approval.rejected',
      entityType: payload.entityType,
      entityId: payload.entityId,
      metadata: { type: payload.type, approvalId: payload.approvalId, comment: payload.comment },
    });
  });

  eventBus.on('approval.escalated', async (payload) => {
    await service.log({
      orgId: payload.orgId,
      userId: payload.previousApproverUserId,
      action: 'approval.escalated',
      entityType: payload.entityType,
      entityId: payload.entityId,
      metadata: {
        type: payload.type,
        approvalId: payload.approvalId,
        previousApproverUserId: payload.previousApproverUserId,
        newApproverUserId: payload.newApproverUserId,
      },
    });
  });

  logger.info('Activity log event listeners registered');
}
