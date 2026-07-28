import { z } from 'zod';

export const loginBodySchema = z.object({
  organizationSlug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .default('vistaar-media'),

  email: z.string().trim().toLowerCase().email(),

  password: z.string().min(1),
});

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1),

  // Policy length is enforced by validatePlainPassword so the reason code stays specific.
  newPassword: z.string().min(1).max(128),
});
