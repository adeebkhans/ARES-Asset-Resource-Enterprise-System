import { Notification } from '@prisma/client';
import { PaginatedResult, PaginationParams } from '@/types/common.types';
import { NotificationRepository } from './notification.repository';

export class NotificationService {
  constructor(private readonly repo: NotificationRepository = new NotificationRepository()) {}

  async create(params: {
    orgId: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
  }): Promise<Notification> {
    return this.repo.create(params);
  }

  async listByUser(
    orgId: string,
    userId: string,
    params: PaginationParams,
    unreadOnly = false,
  ): Promise<PaginatedResult<Notification>> {
    return this.repo.listByUser(orgId, userId, params, unreadOnly);
  }

  async countUnread(orgId: string, userId: string): Promise<number> {
    return this.repo.countUnread(orgId, userId);
  }

  async markAsRead(orgId: string, id: string): Promise<Notification> {
    const notification = await this.repo.findById(orgId, id);
    if (!notification) throw new Error('Notification not found');
    return this.repo.markAsRead(orgId, id);
  }

  async markAllAsRead(orgId: string, userId: string): Promise<number> {
    return this.repo.markAllAsRead(orgId, userId);
  }
}
