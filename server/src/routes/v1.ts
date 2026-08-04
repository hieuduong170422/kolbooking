import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import type { AuditRepository } from '../modules/audit/audit.repository.js';
import { createAuthRouter } from '../modules/auth/auth.routes.js';
import type { SessionRepository } from '../modules/auth/session.repository.js';
import { createCreatorPortfolioRouter } from '../modules/creators/creator-portfolio.routes.js';
import { createCreatorReviewRouter } from '../modules/creators/creator-review.routes.js';
import { createCreatorRouter } from '../modules/creators/creator.routes.js';
import type { CreatorRepository } from '../modules/creators/creator.repository.js';
import { createHealthRouter } from '../modules/health/health.routes.js';
import type { UserRepository } from '../modules/users/user.repository.js';
import { buildErrorBody } from '../shared/http/api-response.js';
import type { FileStorage } from '../shared/storage/file-storage.js';

export interface AppDependencies {
  readonly creatorRepository: CreatorRepository;
  readonly userRepository: UserRepository;
  readonly sessionRepository: SessionRepository;
  readonly auditRepository: AuditRepository;
  readonly fileStorage: FileStorage;
}

/** Rate limit chặt hơn cho auth: chống brute-force login/OTP (SEC-002). */
const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: buildErrorBody('TOO_MANY_REQUESTS', 'Quá nhiều lần thử. Vui lòng đợi một phút.'),
});

/**
 * API v1 — mount route của từng module tại đây.
 * Module mới (bookings, packages, brands...) thêm một dòng mount tương ứng.
 */
export const createV1Router = (deps: AppDependencies): Router => {
  const router = Router();

  router.use('/health', createHealthRouter());
  router.use('/auth', authRateLimiter, createAuthRouter(deps.userRepository, deps.sessionRepository));
  // Mount admin review TRƯỚC creators router: /reviews không được rơi vào /:id (route ordering).
  router.use(
    '/creators',
    createCreatorReviewRouter({
      creatorRepository: deps.creatorRepository,
      userRepository: deps.userRepository,
      auditRepository: deps.auditRepository,
    }),
  );
  // Mount portfolio TRƯỚC creators router: /me/portfolio không được rơi vào /:id.
  router.use(
    '/creators',
    createCreatorPortfolioRouter({
      creatorRepository: deps.creatorRepository,
      fileStorage: deps.fileStorage,
    }),
  );
  router.use('/creators', createCreatorRouter(deps.creatorRepository));

  return router;
};
