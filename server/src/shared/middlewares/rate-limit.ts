import { rateLimit } from 'express-rate-limit';
import { env } from '../../config/env.js';
import { buildErrorBody } from '../http/api-response.js';

/**
 * Rate limit chặt cho các endpoint bị brute-force: đăng nhập, đăng ký,
 * OTP và đặt lại mật khẩu (SEC-002).
 *
 * KHÔNG áp cho /auth/refresh: refresh chạy mỗi lần mở/tải lại trang, đếm
 * chung sẽ khiến người dùng mở vài tab hoặc F5 mấy lần là bị đăng xuất.
 */
export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: buildErrorBody('TOO_MANY_REQUESTS', 'Quá nhiều lần thử. Vui lòng đợi một phút.'),
});
