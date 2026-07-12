import { z } from 'zod';

export const createMaintenanceRequestSchema = z.object({
  assetId: z.string().uuid(),
  issueDescription: z.string().trim().min(1).max(2000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  photos: z.array(z.string()).optional(),
});

export const updateMaintenanceStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'IN_PROGRESS', 'RESOLVED']),
  technicianName: z.string().trim().max(100).optional(),
  resolutionNotes: z.string().trim().max(2000).optional(),
});

export const maintenanceSearchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'RESOLVED']).optional(),
  assetId: z.string().uuid().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  search: z.string().optional(),
});

export type CreateMaintenanceRequestInput = z.infer<typeof createMaintenanceRequestSchema>;
export type UpdateMaintenanceStatusInput = z.infer<typeof updateMaintenanceStatusSchema>;
export type MaintenanceSearchParams = z.infer<typeof maintenanceSearchSchema>;
