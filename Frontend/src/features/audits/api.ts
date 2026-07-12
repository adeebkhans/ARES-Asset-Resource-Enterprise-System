import { apiRequest } from '@/lib/api-client';
import type { AuditCycle, AuditCycleStatus, AuditResult, AuditRecord } from '@/types/domain.types';

export interface AuditSearchParams {
  page?: number;
  pageSize?: number;
  status?: AuditCycleStatus;
  search?: string;
}

export interface CreateAuditCyclePayload {
  scopeDepartmentId?: string;
  scopeLocation?: string;
  startDate: string;
  endDate: string;
  auditorUserIds: string[];
}

export interface UpdateAuditCyclePayload {
  status: AuditCycleStatus;
}

export interface SubmitAuditRecordPayload {
  assetId: string;
  result: AuditResult;
  notes?: string;
}

export function searchAudits(params: AuditSearchParams) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') query.set(k, String(v));
  });
  return apiRequest<AuditCycle[]>(`/audits/search?${query.toString()}`);
}

export function getAuditCycle(id: string) {
  return apiRequest<AuditCycle>(`/audits/${id}`);
}

export function createAuditCycle(payload: CreateAuditCyclePayload) {
  return apiRequest<AuditCycle>('/audits', { method: 'POST', body: payload });
}

export function updateAuditCycleStatus(id: string, payload: UpdateAuditCyclePayload) {
  return apiRequest<AuditCycle>(`/audits/${id}/status`, { method: 'PATCH', body: payload });
}

export function submitAuditRecord(cycleId: string, payload: SubmitAuditRecordPayload) {
  return apiRequest<AuditRecord>(`/audits/${cycleId}/records`, { method: 'POST', body: payload });
}

export function getAuditRecords(cycleId: string) {
  return apiRequest<AuditRecord[]>(`/audits/${cycleId}/records`);
}

export function getMyAuditAssignments() {
  return apiRequest<AuditCycle[]>('/audits/my-assignments');
}

export function getAuditStatusCounts() {
  return apiRequest<Record<string, number>>('/audits/status-counts');
}
