import { eventBus } from '@/core/events';
import { logger } from '@/config/logger';
import { ApprovalService } from './approval.service';
import { NotificationService } from '@/modules/notifications/notification.service';
import { prisma } from '@/core/database/prisma';
import { AssetStatus } from '@prisma/client';
import { ASSET_TRANSITIONS } from '@/constants/asset-states';
import { assertTransition } from '@/shared/state-machine';
import { AssetRepository } from '@/modules/assets/asset.repository';

const service = new ApprovalService();
const notificationService = new NotificationService();
const assetRepo = new AssetRepository();

/**
 * Wire approval domain events to downstream actions (plan.md §5.4).
 *
 * 1. maintenance.raised → create approval request
 * 2. approval.approved (MAINTENANCE) → flip maintenance status + asset status
 * 3. approval.rejected (MAINTENANCE) → flip maintenance status
 * 4. approval.requested / approved / rejected / escalated → notifications
 */
export function registerApprovalListeners(): void {
  // Maintenance raised → create approval request
  eventBus.on('maintenance.raised', async (payload) => {
    try {
      await service.requestApproval(
        payload.orgId,
        'MAINTENANCE',
        'MaintenanceRequest',
        payload.maintenanceRequestId,
        payload.raisedById,
      );
    } catch (err) {
      logger.error({ err, maintenanceRequestId: payload.maintenanceRequestId }, 'Failed to create approval for maintenance request');
    }
  });

  // Approval approved → update maintenance status + asset status
  eventBus.on('approval.approved', async (payload) => {
    if (payload.entityType !== 'MaintenanceRequest') return;

    try {
      // Update maintenance status to APPROVED
      await prisma.maintenanceRequest.update({
        where: { id: payload.entityId },
        data: { status: 'APPROVED' },
      });

      // Flip asset to UNDER_MAINTENANCE
      const maintenance = await prisma.maintenanceRequest.findUnique({
        where: { id: payload.entityId },
        select: { assetId: true },
      });

      if (maintenance) {
        const asset = await assetRepo.findByIdSimple(maintenance.assetId);
        if (asset && ['AVAILABLE', 'ALLOCATED'].includes(asset.status)) {
          const newStatus = assertTransition(ASSET_TRANSITIONS, asset.status, 'approve_maintenance') as AssetStatus;
          await assetRepo.update(asset.orgId, asset.id, { status: newStatus });
          await assetRepo.writeStatusHistory({
            assetId: asset.id,
            fromStatus: asset.status,
            toStatus: newStatus,
            changedBy: payload.decidedById,
            source: 'MAINTENANCE',
            reason: 'Maintenance approved via approval engine',
          });
          eventBus.emit('asset.status.changed', {
            assetId: asset.id,
            orgId: asset.orgId,
            fromStatus: asset.status,
            toStatus: newStatus,
            changedBy: payload.decidedById,
            source: 'MAINTENANCE',
            reason: 'Maintenance approved via approval engine',
          });
        }
      }

      // Emit maintenance status changed for notification listeners
      eventBus.emit('maintenance.status.changed', {
        maintenanceRequestId: payload.entityId,
        orgId: payload.orgId,
        assetId: maintenance?.assetId ?? '',
        fromStatus: 'PENDING' as any,
        toStatus: 'APPROVED' as any,
        changedBy: payload.decidedById,
      });
    } catch (err) {
      logger.error({ err, entityId: payload.entityId }, 'Failed to process approved maintenance');
    }
  });

  // Approval rejected → update maintenance status
  eventBus.on('approval.rejected', async (payload) => {
    if (payload.entityType !== 'MaintenanceRequest') return;

    try {
      await prisma.maintenanceRequest.update({
        where: { id: payload.entityId },
        data: { status: 'REJECTED' },
      });

      const maintenance = await prisma.maintenanceRequest.findUnique({
        where: { id: payload.entityId },
        select: { assetId: true },
      });

      eventBus.emit('maintenance.status.changed', {
        maintenanceRequestId: payload.entityId,
        orgId: payload.orgId,
        assetId: maintenance?.assetId ?? '',
        fromStatus: 'PENDING' as any,
        toStatus: 'REJECTED' as any,
        changedBy: payload.decidedById,
      });
    } catch (err) {
      logger.error({ err, entityId: payload.entityId }, 'Failed to process rejected maintenance');
    }
  });

  // Notifications for approval events
  eventBus.on('approval.requested', async (payload) => {
    if (!payload.currentApproverUserId) return;
    try {
      await notificationService.create({
        orgId: payload.orgId,
        userId: payload.currentApproverUserId,
        type: 'APPROVAL_REQUESTED',
        title: 'New Approval Request',
        message: `A ${payload.type.toLowerCase().replace(/_/g, ' ')} request requires your approval.`,
        relatedEntityType: payload.entityType,
        relatedEntityId: payload.entityId,
      });
    } catch (err) {
      logger.error({ err }, 'Failed to create approval notification');
    }
  });

  eventBus.on('approval.approved', async (payload) => {
    try {
      const approval = await prisma.approval.findUnique({
        where: { id: payload.approvalId },
        select: { requestedById: true },
      });
      if (approval) {
        await notificationService.create({
          orgId: payload.orgId,
          userId: approval.requestedById,
          type: 'APPROVAL_APPROVED',
          title: 'Approval Granted',
          message: `Your ${payload.entityType} request has been approved.`,
          relatedEntityType: payload.entityType,
          relatedEntityId: payload.entityId,
        });
      }
    } catch (err) {
      logger.error({ err }, 'Failed to create approval notification');
    }
  });

  eventBus.on('approval.rejected', async (payload) => {
    try {
      const approval = await prisma.approval.findUnique({
        where: { id: payload.approvalId },
        select: { requestedById: true },
      });
      if (approval) {
        await notificationService.create({
          orgId: payload.orgId,
          userId: approval.requestedById,
          type: 'APPROVAL_REJECTED',
          title: 'Approval Rejected',
          message: `Your ${payload.entityType} request has been rejected.`,
          relatedEntityType: payload.entityType,
          relatedEntityId: payload.entityId,
        });
      }
    } catch (err) {
      logger.error({ err }, 'Failed to create approval notification');
    }
  });

  eventBus.on('approval.escalated', async (payload) => {
    try {
      await notificationService.create({
        orgId: payload.orgId,
        userId: payload.newApproverUserId,
        type: 'APPROVAL_ESCALATED',
        title: 'Approval Escalated',
        message: `A ${payload.entityType} approval has been escalated to you.`,
        relatedEntityType: payload.entityType,
        relatedEntityId: payload.entityId,
      });
    } catch (err) {
      logger.error({ err }, 'Failed to create escalation notification');
    }
  });

  logger.info('Approval event listeners registered');
}
