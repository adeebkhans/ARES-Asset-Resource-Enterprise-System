/**
 * Domain event catalog. New modules should subscribe to existing events instead
 * of the emitting module needing to know they exist — see plan.md §5.4 and
 * docs/event-catalog.md for the full, documented list and payload shapes.
 *
 * Phase 0: identity/asset lifecycle events.
 * Phase 3: maintenance, audit, and notification events appended.
 */
import { AssetStatus, AssetStatusChangeSource, MaintenancePriority, MaintenanceStatus, AuditResult, ApprovalType } from '@prisma/client';

export interface DomainEventMap {
  // Phase 0 — Identity & Asset Lifecycle
  'user.registered': { userId: string; orgId: string; email: string };
  'asset.status.changed': {
    assetId: string;
    orgId: string;
    fromStatus: AssetStatus | null;
    toStatus: AssetStatus;
    changedBy: string | null;
    source: AssetStatusChangeSource;
    reason?: string;
  };
  'asset.registered': { assetId: string; orgId: string; categoryId: string; registeredBy: string };

  // Phase 3 — Maintenance
  'maintenance.raised': {
    maintenanceRequestId: string;
    orgId: string;
    assetId: string;
    raisedById: string;
    priority: MaintenancePriority;
  };
  'maintenance.status.changed': {
    maintenanceRequestId: string;
    orgId: string;
    assetId: string;
    fromStatus: MaintenanceStatus;
    toStatus: MaintenanceStatus;
    changedBy: string;
    resolutionNotes?: string;
  };

  // Phase 3 — Audits
  'audit.cycle.created': {
    auditCycleId: string;
    orgId: string;
    createdBy: string;
    startDate: Date;
    endDate: Date;
  };
  'audit.cycle.closed': {
    auditCycleId: string;
    orgId: string;
    closedBy: string;
    discrepancyCount: number;
  };
  'audit.record.submitted': {
    auditRecordId: string;
    auditCycleId: string;
    orgId: string;
    assetId: string;
    result: AuditResult;
    auditedBy: string;
  };

  // Phase 3 — Notifications
  'notification.created': {
    notificationId: string;
    orgId: string;
    userId: string;
    type: string;
    title: string;
  };

  // Phase 4 — Approvals
  'approval.requested': {
    approvalId: string;
    orgId: string;
    type: ApprovalType;
    entityType: string;
    entityId: string;
    requestedById: string;
    currentApproverUserId: string | null;
    dueAt: Date;
  };
  'approval.approved': {
    approvalId: string;
    orgId: string;
    type: ApprovalType;
    entityType: string;
    entityId: string;
    decidedById: string;
    comment?: string;
  };
  'approval.rejected': {
    approvalId: string;
    orgId: string;
    type: ApprovalType;
    entityType: string;
    entityId: string;
    decidedById: string;
    comment?: string;
  };
  'approval.escalated': {
    approvalId: string;
    orgId: string;
    type: ApprovalType;
    entityType: string;
    entityId: string;
    previousApproverUserId: string;
    newApproverUserId: string;
    dueAt: Date;
  };
}

export type DomainEventName = keyof DomainEventMap;
