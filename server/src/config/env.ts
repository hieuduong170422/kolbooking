import 'dotenv/config';
import { z } from 'zod';

const DEV_ONLY_JWT_SECRET = 'dev-only-secret-change-me-before-production!';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  JWT_SECRET: z.string().min(32).default(DEV_ONLY_JWT_SECRET),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

if (parsed.data.NODE_ENV === 'production' && parsed.data.JWT_SECRET === DEV_ONLY_JWT_SECRET) {
  throw new Error('JWT_SECRET phải được cấu hình riêng khi chạy production.');
}

export const env = Object.freeze(parsed.data);

export type Env = typeof env;
