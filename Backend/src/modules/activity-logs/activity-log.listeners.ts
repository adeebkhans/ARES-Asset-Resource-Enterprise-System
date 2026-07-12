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
      userId: 'system',
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

  logger.info('Activity log event listeners registered');
}
