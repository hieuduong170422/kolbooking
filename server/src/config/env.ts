import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const DEV_ONLY_JWT_SECRET = 'dev-only-secret-change-me-before-production!';

const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Thư mục chứa file upload (SEC-005) — luôn trỏ tới server/uploads, không phụ thuộc cwd. */
export const UPLOADS_DIR = path.join(SERVER_ROOT, 'uploads');

/** File PRIVATE (giấy tờ xác minh brand, BRD-003) — NGOÀI thư mục public, chỉ serve qua endpoint có RBAC. */
export const PRIVATE_UPLOADS_DIR = path.join(SERVER_ROOT, 'private-uploads');

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
  OTP_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  /** Phiên bản điều khoản sử dụng hiện hành — ghi vào consent lúc đăng ký (AUTH-007). */
  TERMS_VERSION: z.string().min(1).default('2026-08-mvp'),
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
