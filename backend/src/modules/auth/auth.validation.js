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
