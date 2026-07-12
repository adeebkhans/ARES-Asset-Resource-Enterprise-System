import { apiRequest } from '@/lib/api-client';
import type { Notification } from '@/types/domain.types';

export function listNotifications(unreadOnly = false) {
  const query = unreadOnly ? '?unreadOnly=true' : '';
  return apiRequest<Notification[]>(`/notifications${query}`);
}

export function getUnreadCount() {
  return apiRequest<{ count: number }>('/notifications/unread-count');
}

export function markAsRead(id: string) {
  return apiRequest<Notification>(`/notifications/${id}/read`, { method: 'PATCH' });
}

export function markAllAsRead() {
  return apiRequest<{ markedCount: number }>('/notifications/read-all', { method: 'PATCH' });
}
