import { z } from 'zod';

export const createAssetSchema = z.object({
  name: z.string().trim().min(1).max(200),
  categoryId: z.string().uuid(),
  serialNumber: z.string().trim().max(100).optional(),
  acquisitionDate: z.string().datetime().optional(),
  acquisitionCost: z.number().min(0).optional(),
  condition: z.string().trim().max(100).optional(),
  location: z.string().trim().max(200).optional(),
  isShared: z.boolean().optional(),
  customFieldValues: z.record(z.unknown()).optional(),
});

export const updateAssetSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  categoryId: z.string().uuid().optional(),
  serialNumber: z.string().trim().max(100).nullable().optional(),
  acquisitionDate: z.string().datetime().nullable().optional(),
  acquisitionCost: z.number().min(0).nullable().optional(),
  condition: z.string().trim().max(100).nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  isShared: z.boolean().optional(),
  customFieldValues: z.record(z.unknown()).optional(),
});

export const assetStatusTransitionSchema = z.object({
  event: z.string().min(1),
  reason: z.string().trim().max(500).optional(),
  source: z.enum(['MANUAL', 'ALLOCATION', 'MAINTENANCE', 'AUDIT', 'TRANSFER']).optional(),
});

export const assetSearchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(['AVAILABLE', 'ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED']).optional(),
  location: z.string().optional(),
  isShared: z.coerce.boolean().optional(),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type AssetStatusTransitionInput = z.infer<typeof assetStatusTransitionSchema>;
export type AssetSearchParams = z.infer<typeof assetSearchSchema>;
