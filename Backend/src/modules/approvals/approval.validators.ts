import { z } from 'zod';
import { paginationQuerySchema } from '@/utils/pagination';

export const upsertRuleSchema = z.object({
  approvalType: z.enum(['MAINTENANCE', 'TRANSFER', 'AUDIT_DISCREPANCY', 'CUSTOM']),
  slaHours: z.number().int().min(1).max(720).default(24),
  escalateToRole: z.enum(['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE']).default('ADMIN'),
});

export const decideApprovalSchema = z.object({
  comment: z.string().trim().max(500).optional(),
});

export const createDelegationSchema = z.object({
  delegateUserId: z.string().uuid(),
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().transform((s) => new Date(s)),
});

export const approvalSearchSchema = paginationQuerySchema.extend({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ESCALATED']).optional(),
  type: z.enum(['MAINTENANCE', 'TRANSFER', 'AUDIT_DISCREPANCY', 'CUSTOM']).optional(),
});

export type UpsertRuleInput = z.infer<typeof upsertRuleSchema>;
export type DecideApprovalInput = z.infer<typeof decideApprovalSchema>;
export type CreateDelegationInput = z.infer<typeof createDelegationSchema>;
export type ApprovalSearchParams = z.infer<typeof approvalSearchSchema>;
