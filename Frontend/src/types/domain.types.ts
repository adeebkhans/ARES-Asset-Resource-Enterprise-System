export type Role = 'ADMIN' | 'ASSET_MANAGER' | 'DEPARTMENT_HEAD' | 'EMPLOYEE';

export type DepartmentStatus = 'ACTIVE' | 'INACTIVE';

export interface Department {
  id: string;
  orgId: string;
  name: string;
  headUserId: string | null;
  parentDepartmentId: string | null;
  status: DepartmentStatus;
  createdAt: string;
  updatedAt: string;
  head?: { id: string; name: string; email: string } | null;
  _count?: { members: number; children: number };
}

export interface AssetCategory {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  customFieldSchema: unknown;
  createdAt: string;
  updatedAt: string;
  _count?: { assets: number };
}

export type AssetStatus = 'AVAILABLE' | 'ALLOCATED' | 'RESERVED' | 'UNDER_MAINTENANCE' | 'LOST' | 'RETIRED' | 'DISPOSED';

export interface Asset {
  id: string;
  orgId: string;
  assetTag: string;
  name: string;
  categoryId: string;
  serialNumber: string | null;
  acquisitionDate: string | null;
  acquisitionCost: number | null;
  condition: string | null;
  location: string | null;
  isShared: boolean;
  status: AssetStatus;
  customFieldValues: Record<string, unknown>;
  qrCodeUrl: string | null;
  photos: string[];
  documents: string[];
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string } | null;
  statusHistory?: AssetStatusHistory[];
}

export interface AssetStatusHistory {
  id: string;
  assetId: string;
  fromStatus: AssetStatus | null;
  toStatus: AssetStatus;
  changedBy: string | null;
  reason: string | null;
  source: string;
  timestamp: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string | null;
  status: string;
  createdAt: string;
  department?: { id: string; name: string } | null;
}

export interface ActivityLog {
  id: string;
  orgId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Phase 3 — Maintenance
// ---------------------------------------------------------------------------

export type MaintenanceStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_PROGRESS' | 'RESOLVED';
export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface MaintenanceRequest {
  id: string;
  orgId: string;
  assetId: string;
  raisedById: string;
  issueDescription: string;
  priority: MaintenancePriority;
  photos: string[];
  technicianName: string | null;
  status: MaintenanceStatus;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  asset?: { id: string; assetTag: string; name: string } | null;
  raisedBy?: { id: string; name: string; email: string } | null;
}

// ---------------------------------------------------------------------------
// Phase 3 — Audits
// ---------------------------------------------------------------------------

export type AuditCycleStatus = 'PLANNED' | 'IN_PROGRESS' | 'CLOSED';
export type AuditResult = 'VERIFIED' | 'MISSING' | 'DAMAGED';

export interface AuditCycle {
  id: string;
  orgId: string;
  scopeDepartmentId: string | null;
  scopeLocation: string | null;
  startDate: string;
  endDate: string;
  status: AuditCycleStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  scopeDepartment?: { id: string; name: string } | null;
  creator?: { id: string; name: string } | null;
  assignments?: { id: string; auditor: { id: string; name: string } }[];
  records?: AuditRecord[];
  _count?: { records: number; assignments: number };
}

export interface AuditRecord {
  id: string;
  auditCycleId: string;
  assetId: string;
  result: AuditResult;
  notes: string | null;
  auditedById: string;
  auditedAt: string;
  asset?: { id: string; assetTag: string; name: string; location: string | null } | null;
  auditedBy?: { id: string; name: string } | null;
}

export interface DiscrepancyReport {
  id: string;
  auditCycleId: string;
  generatedAt: string;
  itemCount: number;
  summary: {
    missing?: { assetId: string; assetTag: string; name: string; location: string | null }[];
    damaged?: { assetId: string; assetTag: string; name: string; location: string | null }[];
  };
}

// ---------------------------------------------------------------------------
// Phase 3 — Notifications
// ---------------------------------------------------------------------------

export interface Notification {
  id: string;
  orgId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  isRead: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Phase 4 — Approvals
// ---------------------------------------------------------------------------

export type ApprovalType = 'MAINTENANCE' | 'TRANSFER' | 'AUDIT_DISCREPANCY' | 'CUSTOM';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ESCALATED';

export interface Approval {
  id: string;
  orgId: string;
  type: ApprovalType;
  entityType: string;
  entityId: string;
  requestedById: string;
  currentApproverUserId: string | null;
  status: ApprovalStatus;
  dueAt: string;
  escalatedAt: string | null;
  decidedById: string | null;
  decidedAt: string | null;
  comment: string | null;
  createdAt: string;
  requestedBy?: { id: string; name: string } | null;
  currentApprover?: { id: string; name: string } | null;
  decidedBy?: { id: string; name: string } | null;
}

export interface ApprovalRule {
  id: string;
  orgId: string;
  approvalType: ApprovalType;
  slaHours: number;
  escalateToRole: string;
  createdBy: string;
}

export interface ApprovalDelegation {
  id: string;
  orgId: string;
  delegatorUserId: string;
  delegateUserId: string;
  startDate: string;
  endDate: string;
  active: boolean;
  delegate?: { id: string; name: string };
  delegator?: { id: string; name: string };
}

// ---------------------------------------------------------------------------
// Phase 5 — Configurable Object Framework
// ---------------------------------------------------------------------------

export type CustomFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SELECT' | 'MULTISELECT' | 'RELATION';
export type CustomFieldTargetType = 'ASSET_CATEGORY' | 'CUSTOM_OBJECT';
export type RelationTarget = 'ASSET' | 'USER' | 'DEPARTMENT' | 'CUSTOM_OBJECT';

export interface CustomFieldDefinition {
  id: string;
  orgId: string;
  targetType: CustomFieldTargetType;
  categoryId: string | null;
  objectDefinitionId: string | null;
  fieldKey: string;
  label: string;
  fieldType: CustomFieldType;
  options: string[];
  isRequired: boolean;
  relationTarget: RelationTarget | null;
  relationObjectDefinitionId: string | null;
  sortOrder: number;
}

export interface CustomObjectDefinition {
  id: string;
  orgId: string;
  key: string;
  label: string;
  pluralLabel: string;
  icon: string | null;
  description: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  _count?: { records: number };
}

export interface CustomObjectRecord {
  id: string;
  orgId: string;
  objectDefinitionId: string;
  data: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface IndustryTemplateSummary {
  tag: string;
  name: string;
  description: string;
  categoryCount: number;
  objectCount: number;
}

export interface ApplyTemplateResult {
  categoriesCreated: string[];
  categoriesSkipped: string[];
  objectsCreated: string[];
  objectsSkipped: string[];
}
