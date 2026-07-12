import { z } from 'zod';

export const createAuditCycleSchema = z.object({
  scopeDepartmentId: z.string().uuid().optional(),
  scopeLocation: z.string().trim().max(200).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  auditorUserIds: z.array(z.string().uuid()).min(1, 'At least one auditor is required'),
});

export const updateAuditCycleSchema = z.object({
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'CLOSED']),
});

export const submitAuditRecordSchema = z.object({
  assetId: z.string().uuid(),
  result: z.enum(['VERIFIED', 'MISSING', 'DAMAGED']),
  notes: z.string().trim().max(2000).optional(),
});

export const auditSearchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'CLOSED']).optional(),
  search: z.string().optional(),
});

export type CreateAuditCycleInput = z.infer<typeof createAuditCycleSchema>;
export type UpdateAuditCycleInput = z.infer<typeof updateAuditCycleSchema>;
export type SubmitAuditRecordInput = z.infer<typeof submitAuditRecordSchema>;
export type AuditSearchParams = z.infer<typeof auditSearchSchema>;
