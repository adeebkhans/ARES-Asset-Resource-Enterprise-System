import { apiRequest } from '@/lib/api-client';
import type { ApplyTemplateResult, IndustryTemplateSummary } from '@/types/domain.types';

export function listIndustryTemplates() {
  return apiRequest<IndustryTemplateSummary[]>('/industry-templates');
}

export function applyIndustryTemplate(tag: string) {
  return apiRequest<ApplyTemplateResult>('/industry-templates/apply', { method: 'POST', body: { tag } });
}
