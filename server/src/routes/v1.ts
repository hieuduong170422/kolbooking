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
import { createAuditRouter } from '../modules/audit/audit.routes.js';
import { createBrandRouter } from '../modules/brands/brand.routes.js';
import type { BrandRepository } from '../modules/brands/brand.repository.js';
import { createHealthRouter } from '../modules/health/health.routes.js';
import { createUserRouter } from '../modules/users/user.routes.js';
import { createPackageRouter } from '../modules/packages/package.routes.js';
import type { PackageRepository } from '../modules/packages/package.repository.js';
import type { VerificationTokenRepository } from '../modules/auth/verification.repository.js';
import type { UserRepository } from '../modules/users/user.repository.js';
import { buildErrorBody } from '../shared/http/api-response.js';
import type { Mailer } from '../shared/email/mailer.js';
import type { FileStorage } from '../shared/storage/file-storage.js';

export interface AppDependencies {
  readonly creatorRepository: CreatorRepository;
  readonly packageRepository: PackageRepository;
  readonly brandRepository: BrandRepository;
  readonly userRepository: UserRepository;
  readonly sessionRepository: SessionRepository;
  readonly verificationTokenRepository: VerificationTokenRepository;
  readonly auditRepository: AuditRepository;
  readonly fileStorage: FileStorage;
  /** Storage cho file private (giấy tờ brand) — TÁCH khỏi fileStorage public (BRD-003). */
  readonly privateFileStorage: FileStorage;
  readonly mailer: Mailer;
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
  router.use(
    '/auth',
    authRateLimiter,
    createAuthRouter({
      users: deps.userRepository,
      sessions: deps.sessionRepository,
      verificationTokens: deps.verificationTokenRepository,
      mailer: deps.mailer,
    }),
  );
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
  router.use(
    '/creators',
    createCreatorRouter({
      creatorRepository: deps.creatorRepository,
      auditRepository: deps.auditRepository,
      userRepository: deps.userRepository,
    }),
  );
  router.use(
    '/packages',
    createPackageRouter({
      packageRepository: deps.packageRepository,
      creatorRepository: deps.creatorRepository,
      auditRepository: deps.auditRepository,
      userRepository: deps.userRepository,
    }),
  );
  router.use(
    '/brands',
    createBrandRouter({
      brandRepository: deps.brandRepository,
      userRepository: deps.userRepository,
      auditRepository: deps.auditRepository,
      privateFileStorage: deps.privateFileStorage,
    }),
  );
  // Khu vực quản trị: quản lý tài khoản + đọc audit log (ADM-002, ADM-004, ADM-009).
  router.use(
    '/users',
    createUserRouter({
      userRepository: deps.userRepository,
      sessionRepository: deps.sessionRepository,
      auditRepository: deps.auditRepository,
    }),
  );
  router.use(
    '/audit',
    createAuditRouter({
      auditRepository: deps.auditRepository,
      userRepository: deps.userRepository,
    }),
  );

  return router;
};
