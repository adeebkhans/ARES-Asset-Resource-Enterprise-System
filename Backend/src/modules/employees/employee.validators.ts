import { z } from 'zod';

export const updateEmployeeRoleSchema = z.object({
  role: z.enum(['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE']),
});

export const updateEmployeeSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  departmentId: z.string().uuid().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export type UpdateEmployeeRoleInput = z.infer<typeof updateEmployeeRoleSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
