import { apiRequest } from '@/lib/api-client';
import type { ActivityLog } from '@/types/domain.types';

export interface ActivityLogSearchParams {
  entityType?: string;
  entityId?: string;
  userId?: string;
}

export function listActivityLogs(params?: ActivityLogSearchParams) {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') query.set(k, v);
    });
  }
  const qs = query.toString();
  return apiRequest<ActivityLog[]>(`/activity-logs${qs ? `?${qs}` : ''}`);
}
