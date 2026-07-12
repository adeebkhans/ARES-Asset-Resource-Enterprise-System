import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '@/features/notifications/api';
import type { Notification } from '@/types/domain.types';

const TYPE_LABELS: Record<string, string> = {
  MAINTENANCE_RAISED: 'Maintenance',
  MAINTENANCE_STATUS_CHANGED: 'Maintenance',
  AUDIT_CYCLE_CREATED: 'Audit',
  AUDIT_CYCLE_CLOSED: 'Audit',
  AUDIT_ASSIGNED: 'Audit',
  AUDIT_DISCREPANCY: 'Audit',
  APPROVAL_REQUESTED: 'Approval',
  APPROVAL_APPROVED: 'Approval',
  APPROVAL_REJECTED: 'Approval',
  APPROVAL_ESCALATED: 'Approval',
  SYSTEM: 'System',
};

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', unreadOnly],
    queryFn: () => listNotifications(unreadOnly),
  });

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: getUnreadCount,
  });

  const markReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900 text-black">Notifications</h1>
        <p className="text-sm text-ink-500">System alerts and status updates.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant={unreadOnly ? 'primary' : 'secondary'} onClick={() => setUnreadOnly(!unreadOnly)}>
          {unreadOnly ? `Unread (${unreadData?.count ?? 0})` : 'All'}
        </Button>
        {(unreadData?.count ?? 0) > 0 && (
          <Button variant="secondary" onClick={() => markAllReadMutation.mutate()}>
            Mark all read
          </Button>
        )}
      </div>

      {isLoading && <p className="text-sm text-ink-500">Loading…</p>}

      {!isLoading && notifications.length === 0 && (
        <EmptyState icon="bell" title="All quiet" description="You'll see updates from Maintenance, Audits, and Approvals here." />
      )}

      {notifications.length > 0 && (
        <div className="flex flex-col gap-2">
          {notifications.map((n: Notification) => (
            <Card
              key={n.id}
              className={`flex items-start gap-3 p-4 ${!n.isRead ? 'border-l-4 border-brand-500' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink-900 text-black">{n.title}</span>
                  <Badge variant="default">{TYPE_LABELS[n.type] ?? n.type}</Badge>
                  {!n.isRead && <Badge variant="brand">New</Badge>}
                </div>
                <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">{n.message}</p>
                <span className="mt-1 block text-xs text-ink-400">
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </div>
              {!n.isRead && (
                <button
                  className="text-xs text-brand-700 hover:underline shrink-0 dark:text-brand-400"
                  onClick={() => markReadMutation.mutate(n.id)}
                >
                  Mark read
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
