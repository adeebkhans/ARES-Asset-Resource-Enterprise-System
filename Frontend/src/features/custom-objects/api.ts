import { apiRequest } from '@/lib/api-client';
import type { CustomFieldDefinition, CustomObjectDefinition, CustomObjectRecord } from '@/types/domain.types';

export interface CreateObjectDefinitionPayload {
  key: string;
  label: string;
  pluralLabel: string;
  icon?: string;
  description?: string;
}

export interface CreateFieldPayload {
  fieldKey: string;
  label: string;
  fieldType: CustomFieldDefinition['fieldType'];
  options?: string[];
  isRequired?: boolean;
  relationTarget?: CustomFieldDefinition['relationTarget'];
  relationObjectDefinitionId?: string;
  sortOrder?: number;
}

export function listObjectDefinitions() {
  return apiRequest<CustomObjectDefinition[]>('/custom-objects');
}

export function getObjectDefinition(id: string) {
  return apiRequest<CustomObjectDefinition>(`/custom-objects/${id}`);
}

export function createObjectDefinition(payload: CreateObjectDefinitionPayload) {
  return apiRequest<CustomObjectDefinition>('/custom-objects', { method: 'POST', body: payload });
}

export function deleteObjectDefinition(id: string) {
  return apiRequest<{ deleted: boolean }>(`/custom-objects/${id}`, { method: 'DELETE' });
}

export function updateObjectDefinition(id: string, payload: { label?: string; pluralLabel?: string; icon?: string; description?: string }) {
  return apiRequest<CustomObjectDefinition>(`/custom-objects/${id}`, { method: 'PATCH', body: payload });
}

export function listFieldsForObject(objectId: string) {
  return apiRequest<CustomFieldDefinition[]>(`/custom-objects/${objectId}/fields`);
}

export function createFieldForObject(objectId: string, payload: CreateFieldPayload) {
  return apiRequest<CustomFieldDefinition>(`/custom-objects/${objectId}/fields`, { method: 'POST', body: payload });
}

export function updateField(fieldId: string, payload: { label?: string; options?: string[]; isRequired?: boolean; sortOrder?: number }) {
  return apiRequest<CustomFieldDefinition>(`/custom-objects/fields/${fieldId}`, { method: 'PATCH', body: payload });
}

export function deleteField(fieldId: string) {
  return apiRequest<{ deleted: boolean }>(`/custom-objects/fields/${fieldId}`, { method: 'DELETE' });
}

export function listRecords(objectId: string) {
  return apiRequest<CustomObjectRecord[]>(`/custom-objects/${objectId}/records`);
}

export function createRecord(objectId: string, data: Record<string, unknown>) {
  return apiRequest<CustomObjectRecord>(`/custom-objects/${objectId}/records`, { method: 'POST', body: { data } });
}

export function updateRecord(recordId: string, data: Record<string, unknown>) {
  return apiRequest<CustomObjectRecord>(`/custom-objects/records/${recordId}`, { method: 'PATCH', body: { data } });
}

export function deleteRecord(recordId: string) {
  return apiRequest<{ deleted: boolean }>(`/custom-objects/records/${recordId}`, { method: 'DELETE' });
}

export function getRecord(recordId: string) {
  return apiRequest<CustomObjectRecord>(`/custom-objects/records/${recordId}`);
}

// Layer 1 — category custom fields, exposed under /asset-categories.
export function listCategoryFields(categoryId: string) {
  return apiRequest<CustomFieldDefinition[]>(`/asset-categories/${categoryId}/fields`);
}

export function createCategoryField(categoryId: string, payload: CreateFieldPayload) {
  return apiRequest<CustomFieldDefinition>(`/asset-categories/${categoryId}/fields`, { method: 'POST', body: payload });
}
