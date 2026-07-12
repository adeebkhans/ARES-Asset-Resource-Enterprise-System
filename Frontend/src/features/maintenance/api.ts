import { apiRequest } from '@/lib/api-client';
import type { MaintenanceRequest, MaintenanceStatus, MaintenancePriority, Approval } from '@/types/domain.types';

export interface MaintenanceSearchParams {
  page?: number;
  pageSize?: number;
  status?: MaintenanceStatus;
  assetId?: string;
  priority?: MaintenancePriority;
  search?: string;
}

export interface CreateMaintenancePayload {
  assetId: string;
  issueDescription: string;
  priority?: MaintenancePriority;
  photos?: string[];
}

export interface UpdateMaintenanceStatusPayload {
  status: MaintenanceStatus;
  technicianName?: string;
  resolutionNotes?: string;
}

export function searchMaintenance(params: MaintenanceSearchParams) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') query.set(k, String(v));
  });
  return apiRequest<MaintenanceRequest[]>(`/maintenance/search?${query.toString()}`);
}

export function getMaintenanceRequest(id: string) {
  return apiRequest<MaintenanceRequest>(`/maintenance/${id}`);
}

export function createMaintenanceRequest(payload: CreateMaintenancePayload) {
  return apiRequest<MaintenanceRequest>('/maintenance', { method: 'POST', body: payload });
}

export function updateMaintenanceStatus(id: string, payload: UpdateMaintenanceStatusPayload) {
  return apiRequest<MaintenanceRequest>(`/maintenance/${id}/status`, { method: 'PATCH', body: payload });
}

export function getMaintenanceStatusCounts() {
  return apiRequest<Record<string, number>>('/maintenance/status-counts');
}

export function getMaintenanceApproval(id: string) {
  return apiRequest<Approval | null>(`/maintenance/${id}/approval`);
}
