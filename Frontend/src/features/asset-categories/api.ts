import { apiRequest } from '@/lib/api-client';
import type { AssetCategory } from '@/types/domain.types';

export interface CreateCategoryPayload {
  name: string;
  description?: string;
}

export interface UpdateCategoryPayload {
  name?: string;
  description?: string | null;
}

export function listCategories() {
  return apiRequest<AssetCategory[]>('/asset-categories');
}

export function getCategory(id: string) {
  return apiRequest<AssetCategory>(`/asset-categories/${id}`);
}

export function createCategory(payload: CreateCategoryPayload) {
  return apiRequest<AssetCategory>('/asset-categories', { method: 'POST', body: payload });
}

export function updateCategory(id: string, payload: UpdateCategoryPayload) {
  return apiRequest<AssetCategory>(`/asset-categories/${id}`, { method: 'PATCH', body: payload });
}

export function deleteCategory(id: string) {
  return apiRequest<{ deleted: boolean }>(`/asset-categories/${id}`, { method: 'DELETE' });
}
