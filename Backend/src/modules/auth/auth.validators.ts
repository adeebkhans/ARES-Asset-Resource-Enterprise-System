import { z } from 'zod';
import { emailSchema, passwordSchema } from '@/shared/validators';

/** Bootstraps a brand-new tenant: creates the Organization and its first user as ADMIN. */
export const registerOrganizationSchema = z.object({
  organizationName: z.string().trim().min(2).max(120),
  adminName: z.string().trim().min(2).max(120),
  email: emailSchema,
  password: passwordSchema,
});

/** Joins an existing org. Always creates an Employee — role is never client-suppliable (plan.md §5.6). */
export const signupSchema = z.object({
  orgSlug: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterOrganizationInput = z.infer<typeof registerOrganizationSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
