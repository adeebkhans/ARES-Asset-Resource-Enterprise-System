import { apiRequest } from '@/lib/api-client';
import type { Asset, AssetStatus } from '@/types/domain.types';

export interface CreateAssetPayload {
  name: string;
  categoryId: string;
  serialNumber?: string;
  acquisitionDate?: string;
  acquisitionCost?: number;
  condition?: string;
  location?: string;
  isShared?: boolean;
  customFieldValues?: Record<string, unknown>;
}

export interface UpdateAssetPayload {
  name?: string;
  categoryId?: string;
  serialNumber?: string | null;
  acquisitionDate?: string | null;
  acquisitionCost?: number | null;
  condition?: string | null;
  location?: string | null;
  isShared?: boolean;
  customFieldValues?: Record<string, unknown>;
}

export interface AssetSearchParams {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  status?: AssetStatus;
  location?: string;
  isShared?: boolean;
}

export function listAssets() {
  return apiRequest<Asset[]>('/assets');
}

export function searchAssets(params: AssetSearchParams) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') query.set(k, String(v));
  });
  return apiRequest<Asset[]>(`/assets/search?${query.toString()}`);
}

export function getAsset(id: string) {
  return apiRequest<Asset>(`/assets/${id}`);
}

export function createAsset(payload: CreateAssetPayload) {
  return apiRequest<Asset>('/assets', { method: 'POST', body: payload });
}

export function updateAsset(id: string, payload: UpdateAssetPayload) {
  return apiRequest<Asset>(`/assets/${id}`, { method: 'PATCH', body: payload });
}

export function transitionAssetStatus(id: string, event: string, reason?: string, source?: string) {
  return apiRequest<Asset>(`/assets/${id}/transition`, {
    method: 'POST',
    body: { event, reason, source },
  });
}

export function getAssetStatusCounts() {
  return apiRequest<Record<string, number>>('/assets/status-counts');
}
