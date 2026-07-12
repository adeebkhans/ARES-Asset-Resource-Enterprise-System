import { z } from 'zod';

export const applyTemplateSchema = z.object({
  tag: z.enum(['SCHOOL', 'HOSPITAL', 'HOTEL', 'FACTORY']),
});

export type ApplyTemplateInput = z.infer<typeof applyTemplateSchema>;
