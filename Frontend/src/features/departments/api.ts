import { apiRequest } from '@/lib/api-client';
import type { Department } from '@/types/domain.types';

export interface CreateDepartmentPayload {
  name: string;
  headUserId?: string;
  parentDepartmentId?: string;
}

export interface UpdateDepartmentPayload {
  name?: string;
  headUserId?: string | null;
  parentDepartmentId?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
}

export function listDepartments() {
  return apiRequest<Department[]>('/departments');
}

export function getDepartment(id: string) {
  return apiRequest<Department>(`/departments/${id}`);
}

export function getDepartmentTree() {
  return apiRequest<Department[]>('/departments/tree');
}

export function createDepartment(payload: CreateDepartmentPayload) {
  return apiRequest<Department>('/departments', { method: 'POST', body: payload });
}

export function updateDepartment(id: string, payload: UpdateDepartmentPayload) {
  return apiRequest<Department>(`/departments/${id}`, { method: 'PATCH', body: payload });
}

export function deleteDepartment(id: string) {
  return apiRequest<{ deleted: boolean }>(`/departments/${id}`, { method: 'DELETE' });
}
