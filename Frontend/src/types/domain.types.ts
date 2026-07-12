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
