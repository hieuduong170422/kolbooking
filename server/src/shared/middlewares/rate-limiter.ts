import { rateLimit } from 'express-rate-limit';
import { env } from '../../config/env.js';
import { buildErrorBody } from '../http/api-response.js';

export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: buildErrorBody('TOO_MANY_REQUESTS', 'Quá nhiều yêu cầu. Vui lòng thử lại sau.'),
});
