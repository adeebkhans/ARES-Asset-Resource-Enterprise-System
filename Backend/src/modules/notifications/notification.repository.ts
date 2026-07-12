import { Notification } from '@prisma/client';
import { prisma } from '@/core/database/prisma';
import { PaginatedResult, PaginationParams } from '@/types/common.types';
import { buildPaginatedResult, toSkipTake } from '@/utils/pagination';

export class NotificationRepository {
  async create(data: {
    orgId: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
  }): Promise<Notification> {
    return prisma.notification.create({ data });
  }

  async findById(orgId: string, id: string): Promise<Notification | null> {
    return prisma.notification.findFirst({ where: { id, orgId } });
  }

  async listByUser(
    orgId: string,
    userId: string,
    params: PaginationParams,
    unreadOnly = false,
  ): Promise<PaginatedResult<Notification>> {
    const { skip, take } = toSkipTake(params);
    const where: Record<string, unknown> = { orgId, userId };
    if (unreadOnly) where.isRead = false;

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);
    return buildPaginatedResult(items, total, params);
  }

  async countUnread(orgId: string, userId: string): Promise<number> {
    return prisma.notification.count({
      where: { orgId, userId, isRead: false },
    });
  }

  async markAsRead(orgId: string, id: string): Promise<Notification> {
    const notification = await prisma.notification.findFirst({ where: { id, orgId } });
    if (!notification) throw new Error('Notification not found');
    return prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(orgId: string, userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { orgId, userId, isRead: false },
      data: { isRead: true },
    });
    return result.count;
  }

  async deleteOlderThan(orgId: string, userId: string, days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await prisma.notification.deleteMany({
      where: { orgId, userId, createdAt: { lt: cutoff } },
    });
    return result.count;
  }
}
