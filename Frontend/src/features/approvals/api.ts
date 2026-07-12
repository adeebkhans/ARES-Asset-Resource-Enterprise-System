import { apiRequest } from '@/lib/api-client';
import type { Approval, ApprovalStatus, ApprovalType, ApprovalDelegation } from '@/types/domain.types';

export interface ApprovalSearchParams {
  page?: number;
  pageSize?: number;
  status?: ApprovalStatus;
  type?: ApprovalType;
}

export interface DecideApprovalPayload {
  comment?: string;
}

export interface UpsertRulePayload {
  approvalType: ApprovalType;
  slaHours?: number;
  escalateToRole?: string;
}

export interface CreateDelegationPayload {
  delegateUserId: string;
  startDate: string;
  endDate: string;
}

export function searchApprovals(params: ApprovalSearchParams) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') query.set(k, String(v));
  });
  return apiRequest<Approval[]>(`/approvals?${query.toString()}`);
}

export function getPendingApprovals() {
  return apiRequest<Approval[]>('/approvals/pending');
}

export function getApprovalStatusCounts() {
  return apiRequest<Record<string, number>>('/approvals/status-counts');
}

export function getApprovalForEntity(entityType: string, entityId: string) {
  return apiRequest<Approval | null>(`/approvals/entity/${entityType}/${entityId}`);
}

export function approveApproval(id: string, payload?: DecideApprovalPayload) {
  return apiRequest<Approval>(`/approvals/${id}/approve`, { method: 'PATCH', body: payload ?? {} });
}

export function rejectApproval(id: string, payload?: DecideApprovalPayload) {
  return apiRequest<Approval>(`/approvals/${id}/reject`, { method: 'PATCH', body: payload ?? {} });
}

export function upsertRule(payload: UpsertRulePayload) {
  return apiRequest<Approval>('/approvals/rules', { method: 'POST', body: payload });
}

export function getRule(type: ApprovalType) {
  return apiRequest<Approval>(`/approvals/rules/${type}`);
}

export function createDelegation(payload: CreateDelegationPayload) {
  return apiRequest<ApprovalDelegation>('/approvals/delegations', { method: 'POST', body: payload });
}

export function getDelegations() {
  return apiRequest<ApprovalDelegation[]>('/approvals/delegations');
}

export function revokeDelegation(id: string) {
  return apiRequest<{ deleted: boolean }>(`/approvals/delegations/${id}`, { method: 'DELETE' });
}
