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
  /**
   * Giới hạn chung mỗi IP/phút. Đặt 300 vì client có polling: chat 8 giây
   * (~8 req/phút) + thông báo 30 giây, mỗi lần mở trang lại gọi 4-6 API.
   * Một người mở vài tab, hoặc một văn phòng chung IP NAT, rất dễ vượt 100.
   */
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  /**
   * Công tắc cho giới hạn chung. MẶC ĐỊNH BẬT: quên cấu hình thì vẫn được
   * bảo vệ. Chỉ tắt có chủ đích ở máy local (script `dev` đã đặt sẵn) vì
   * e2e mở 3 phiên song song cộng polling là vượt ngưỡng ngay.
   * KHÔNG dùng z.coerce.boolean(): chuỗi "false" vẫn ra true.
   */
  RATE_LIMIT_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  JWT_SECRET: z.string().min(32).default(DEV_ONLY_JWT_SECRET),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  OTP_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  /** Phiên bản điều khoản sử dụng hiện hành — ghi vào consent lúc đăng ký (AUTH-007). */
  TERMS_VERSION: z.string().min(1).default('2026-08-mvp'),
  /** Phí nền tảng brand trả thêm (SRS §2.4: 10-15%) — KHÔNG hardcode (§12.4). */
  PLATFORM_FEE_PERCENT: z.coerce.number().min(0).max(50).default(12),
  PLATFORM_FEE_MIN_VND: z.coerce.number().int().nonnegative().default(50_000),
  /**
   * Chuỗi kết nối PostgreSQL. Bỏ trống → chạy in-memory (dev/test nhanh,
   * mất dữ liệu khi restart). Có giá trị → mọi repository dùng PostgreSQL.
   */
  DATABASE_URL: z.string().min(1).optional(),
  /** Số kết nối tối đa trong pool — đủ cho một tiến trình API cỡ MVP. */
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  /**
   * Cờ Secure của cookie refresh. Bỏ trống → theo NODE_ENV (production bật).
   * Phải đặt 'false' khi chạy HTTP trần trên IP: trình duyệt loại bỏ cookie
   * Secure trên http://, phiên đăng nhập sẽ chết ngay khi access token hết hạn.
   */
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  /**
   * Thư mục chứa bản build của client. Có giá trị thì chính API phục vụ luôn
   * giao diện — một tiến trình là đủ để chạy, không cần nginx hay vite preview
   * đứng trước. Đường dẫn tương đối tính từ thư mục server/.
   * Bỏ trống (mặc định) thì API chỉ phục vụ /api và /uploads.
   */
  SERVE_CLIENT_DIR: z.string().min(1).optional(),
  /**
   * Nạp dữ liệu demo (tài khoản demo, creator, package, brand) khi database
   * còn rỗng. Bật cho môi trường thử nghiệm; TẮT khi chạy thật vì mật khẩu
   * demo là công khai.
   */
  SEED_DEMO_DATA: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
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

/** Thư mục client đã giải nghĩa thành đường dẫn tuyệt đối; null = không phục vụ. */
const clientDir =
  parsed.data.SERVE_CLIENT_DIR === undefined
    ? null
    : path.resolve(SERVER_ROOT, parsed.data.SERVE_CLIENT_DIR);

export const env = Object.freeze({
  ...parsed.data,
  CLIENT_DIR: clientDir,
  /** Giá trị đã giải nghĩa: undefined nghĩa là theo NODE_ENV. */
  COOKIE_SECURE:
    parsed.data.COOKIE_SECURE === undefined
      ? parsed.data.NODE_ENV === 'production'
      : parsed.data.COOKIE_SECURE === 'true',
});

export type Env = typeof env;
