import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const booleanString = z.preprocess((value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === 'true') {
    return true;
  }

  if (normalizedValue === 'false') {
    return false;
  }

  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  PORT: z.coerce.number().int().positive().default(5001),

  FRONTEND_ORIGIN: z.string().url(),

  MONGODB_URI: z.string().min(1),

  REDIS_URL: z.string().min(1),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  BCRYPT_ROUNDS: z.coerce.number().int().min(12).max(15).default(12),

  JWT_ACCESS_SECRET: z.string().min(32),

  JWT_ACCESS_EXPIRES_IN: z.string().min(2).default('15m'),

  REFRESH_TOKEN_BYTES: z.coerce.number().int().min(32).max(128).default(64),

  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),

  ENCRYPTION_KEY_CURRENT_VERSION: z
    .string()
    .regex(/^[1-9]\d*$/)
    .optional(),

  ENCRYPTION_KEY_V1: z.string().optional(),

  ENCRYPTION_KEY_V2: z.string().optional(),

  ENCRYPTION_KEY_V3: z.string().optional(),

  WHATSAPP_PROVIDER: z.enum(['baileys']).default('baileys'),

  WHATSAPP_ENABLED: booleanString.default(false),

  WHATSAPP_POC_ACCOUNT_ID: z.string().optional(),

  WHATSAPP_QR_OUTPUT: z.enum(['terminal']).default('terminal'),

  WHATSAPP_ALLOW_DISPOSABLE_POC_ONLY: booleanString.default(true),

  WHATSAPP_SEND_TEXT_POC_ENABLED: booleanString.default(false),

  WHATSAPP_MAX_OUTBOUND_PER_MINUTE: z.coerce.number().int().min(1).max(20).default(5),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid environment configuration.');
  console.error(result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;
