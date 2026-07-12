import { apiRequest } from '@/lib/api-client';
import type { Employee } from '@/types/domain.types';

export interface UpdateEmployeePayload {
  name?: string;
  departmentId?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateRolePayload {
  role: 'ADMIN' | 'ASSET_MANAGER' | 'DEPARTMENT_HEAD' | 'EMPLOYEE';
}

export function listEmployees(search?: string) {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiRequest<Employee[]>(`/employees${query}`);
}

export function getEmployee(id: string) {
  return apiRequest<Employee>(`/employees/${id}`);
}

export function updateEmployee(id: string, payload: UpdateEmployeePayload) {
  return apiRequest<Employee>(`/employees/${id}`, { method: 'PATCH', body: payload });
}

export function updateEmployeeRole(id: string, payload: UpdateRolePayload) {
  return apiRequest<Employee>(`/employees/${id}/role`, { method: 'PATCH', body: payload });
}
