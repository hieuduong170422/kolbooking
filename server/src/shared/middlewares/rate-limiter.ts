import { rateLimit } from 'express-rate-limit';
import { env } from '../../config/env.js';
import { buildErrorBody } from '../http/api-response.js';

/**
 * Giới hạn chung cho toàn bộ API (NFR/SEC) — chống lạm dụng/scrape.
 *
 * Tắt được qua RATE_LIMIT_ENABLED=false, mặc định BẬT để quên cấu hình vẫn
 * an toàn. Lý do cần công tắc: limiter này đã ba lần gây lỗi giả ở local
 * (F5 vài lần là đăng xuất, suite test đỏ ngẫu nhiên, e2e mất nút vì
 * /auth/refresh nhận 429) — e2e mở 3 phiên song song, client poll chat 8s
 * và thông báo 30s, mỗi lần tải trang lại gọi 4-6 API.
 *
 * Test luôn tắt: limiter là singleton cấp module nên mọi app dựng trong
 * cùng worker dùng chung bộ đếm.
 */
interface ApiRateLimiterOptions {
  readonly enabled: boolean;
  /** Cho phép test dựng limiter ngưỡng thấp thay vì bắn 300 request. */
  readonly limit?: number;
}

export const createApiRateLimiter = ({ enabled, limit = env.RATE_LIMIT_MAX }: ApiRateLimiterOptions) =>
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => !enabled,
    message: buildErrorBody('TOO_MANY_REQUESTS', 'Quá nhiều yêu cầu. Vui lòng thử lại sau.'),
  });

export const apiRateLimiter = createApiRateLimiter({
  enabled: env.RATE_LIMIT_ENABLED && env.NODE_ENV !== 'test',
});
