import { rateLimit } from 'express-rate-limit';
import { env } from '../../config/env.js';
import { buildErrorBody } from '../http/api-response.js';

/**
 * Giới hạn chung cho toàn bộ API (NFR/SEC).
 *
 * Bỏ qua khi NODE_ENV=test: limiter là singleton cấp module nên MỌI app
 * dựng trong cùng worker test dùng chung một bộ đếm. Suite chạy vài trăm
 * request trong một phút sẽ vượt ngưỡng và nhận 429 ở test ngẫu nhiên —
 * đúng nguyên nhân khiến suite đỏ rồi tự xanh khi chạy lại.
 */
export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: buildErrorBody('TOO_MANY_REQUESTS', 'Quá nhiều yêu cầu. Vui lòng thử lại sau.'),
});
