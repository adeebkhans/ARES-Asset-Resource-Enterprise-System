import { eventBus } from '@/core/events';
import { logger } from '@/config/logger';
import { NotificationService } from './notification.service';
import { prisma } from '@/core/database/prisma';

const service = new NotificationService();

/**
 * Wire domain events to notification creation (plan.md §5.4).
 * Each listener creates an in-app notification for the relevant user(s).
 */
export function registerNotificationListeners(): void {
  // Maintenance raised → notify all admins and asset managers in the org
  eventBus.on('maintenance.raised', async (payload) => {
    const managers = await prisma.user.findMany({
      where: {
        orgId: payload.orgId,
        role: { in: ['ADMIN', 'ASSET_MANAGER'] },
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    for (const manager of managers) {
      await service.create({
        orgId: payload.orgId,
        userId: manager.id,
        type: 'MAINTENANCE_RAISED',
        title: 'New Maintenance Request',
        message: `A maintenance request has been raised for an asset (priority: ${payload.priority}).`,
        relatedEntityType: 'MaintenanceRequest',
        relatedEntityId: payload.maintenanceRequestId,
      });
    }
  });

  // Maintenance status changed → notify the user who raised the request
  eventBus.on('maintenance.status.changed', async (payload) => {
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id: payload.maintenanceRequestId },
      select: { raisedById: true },
    });
    if (!request) return;

    const statusMessages: Record<string, string> = {
      APPROVED: 'Your maintenance request has been approved.',
      REJECTED: 'Your maintenance request has been rejected.',
      IN_PROGRESS: 'Your maintenance request is now in progress.',
      RESOLVED: 'Your maintenance request has been resolved.',
    };

    await service.create({
      orgId: payload.orgId,
      userId: request.raisedById,
      type: `MAINTENANCE_${payload.toStatus}`,
      title: `Maintenance ${payload.toStatus.toLowerCase().replace(/_/g, ' ')}`,
      message: statusMessages[payload.toStatus] ?? `Maintenance request status updated to ${payload.toStatus}.`,
      relatedEntityType: 'MaintenanceRequest',
      relatedEntityId: payload.maintenanceRequestId,
    });
  });

  // Audit cycle created → notify assigned auditors
  eventBus.on('audit.cycle.created', async (payload) => {
    const assignments = await prisma.auditAssignment.findMany({
      where: { auditCycleId: payload.auditCycleId },
      select: { auditorUserId: true },
    });

    for (const assignment of assignments) {
      await service.create({
        orgId: payload.orgId,
        userId: assignment.auditorUserId,
        type: 'AUDIT_ASSIGNED',
        title: 'New Audit Assignment',
        message: `You have been assigned to an audit cycle starting ${payload.startDate.toLocaleDateString()}.`,
        relatedEntityType: 'AuditCycle',
        relatedEntityId: payload.auditCycleId,
      });
    }
  });

  // Audit cycle closed → notify all users in the org about discrepancy count
  eventBus.on('audit.cycle.closed', async (payload) => {
    if (payload.discrepancyCount > 0) {
      const admins = await prisma.user.findMany({
        where: { orgId: payload.orgId, role: 'ADMIN', status: 'ACTIVE' },
        select: { id: true },
      });

      for (const admin of admins) {
        await service.create({
          orgId: payload.orgId,
          userId: admin.id,
          type: 'AUDIT_DISCREPANCY',
          title: 'Audit Discrepancies Found',
          message: `An audit cycle has been closed with ${payload.discrepancyCount} discrepancy(ies). Review required.`,
          relatedEntityType: 'AuditCycle',
          relatedEntityId: payload.auditCycleId,
        });
      }
    }
  });

  logger.info('Notification event listeners registered');
}
