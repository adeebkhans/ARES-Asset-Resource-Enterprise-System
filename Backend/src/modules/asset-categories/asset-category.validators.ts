import { z } from 'zod';

export const createAssetCategorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
});

export const updateAssetCategorySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

export type CreateAssetCategoryInput = z.infer<typeof createAssetCategorySchema>;
export type UpdateAssetCategoryInput = z.infer<typeof updateAssetCategorySchema>;
