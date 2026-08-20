import { Router } from 'express';
import type { AuditRepository } from '../modules/audit/audit.repository.js';
import { createAuthRouter } from '../modules/auth/auth.routes.js';
import type { SessionRepository } from '../modules/auth/session.repository.js';
import { createCreatorPortfolioRouter } from '../modules/creators/creator-portfolio.routes.js';
import { createCreatorReviewRouter } from '../modules/creators/creator-review.routes.js';
import { createCreatorRouter } from '../modules/creators/creator.routes.js';
import type { CreatorRepository } from '../modules/creators/creator.repository.js';
import { createAuditRouter } from '../modules/audit/audit.routes.js';
import { createBookingRouter } from '../modules/bookings/booking.routes.js';
import type { BookingRepository } from '../modules/bookings/booking.repository.js';
import { createBrandRouter } from '../modules/brands/brand.routes.js';
import { createConfigRouter } from '../modules/config/config.routes.js';
import { createConversationRouter } from '../modules/conversations/conversation.routes.js';
import type { ConversationRepository } from '../modules/conversations/conversation.repository.js';
import { createSubmissionRouter } from '../modules/submissions/submission.routes.js';
import type { SubmissionRepository } from '../modules/submissions/submission.repository.js';
import type { MessageRepository } from '../modules/messages/message.repository.js';
import { createNotificationRouter } from '../modules/notifications/notification.routes.js';
import type { NotificationRepository } from '../modules/notifications/notification.repository.js';
import { NotificationService } from '../modules/notifications/notification.service.js';
import type { BrandRepository } from '../modules/brands/brand.repository.js';
import { createFavoriteRouter } from '../modules/favorites/favorite.routes.js';
import type { FavoriteRepository } from '../modules/favorites/favorite.repository.js';
import { createHealthRouter } from '../modules/health/health.routes.js';
import { createReportRouter } from '../modules/reports/report.routes.js';
import type { ReportRepository } from '../modules/reports/report.repository.js';
import { createUserRouter } from '../modules/users/user.routes.js';
import { createPackageRouter } from '../modules/packages/package.routes.js';
import type { PackageRepository } from '../modules/packages/package.repository.js';
import type { VerificationTokenRepository } from '../modules/auth/verification.repository.js';
import type { UserRepository } from '../modules/users/user.repository.js';
import type { Mailer } from '../shared/email/mailer.js';
import type { FileStorage } from '../shared/storage/file-storage.js';

export interface AppDependencies {
  readonly creatorRepository: CreatorRepository;
  readonly packageRepository: PackageRepository;
  readonly brandRepository: BrandRepository;
  readonly bookingRepository: BookingRepository;
  readonly messageRepository: MessageRepository;
  readonly conversationRepository: ConversationRepository;
  readonly submissionRepository: SubmissionRepository;
  readonly notificationRepository: NotificationRepository;
  readonly favoriteRepository: FavoriteRepository;
  readonly reportRepository: ReportRepository;
  readonly userRepository: UserRepository;
  readonly sessionRepository: SessionRepository;
  readonly verificationTokenRepository: VerificationTokenRepository;
  readonly auditRepository: AuditRepository;
  readonly fileStorage: FileStorage;
  /** Storage cho file private (giấy tờ brand) — TÁCH khỏi fileStorage public (BRD-003). */
  readonly privateFileStorage: FileStorage;
  readonly mailer: Mailer;
}

/**
 * API v1 — mount route của từng module tại đây.
 * Module mới (bookings, packages, brands...) thêm một dòng mount tương ứng.
 */
export const createV1Router = (deps: AppDependencies): Router => {
  const router = Router();

  // Một instance dùng chung cho mọi module cần gửi thông báo (NTF-001).
  const notificationService = new NotificationService(
    deps.notificationRepository,
    deps.userRepository,
    deps.mailer,
  );

  router.use('/health', createHealthRouter());
  // Cấu hình công khai (phí nền tảng, phiên bản điều khoản) — client ước tính theo đây.
  router.use('/config', createConfigRouter());
  router.use(
    '/auth',
    createAuthRouter({
      users: deps.userRepository,
      sessions: deps.sessionRepository,
      verificationTokens: deps.verificationTokenRepository,
      mailer: deps.mailer,
      audit: deps.auditRepository,
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
  router.use(
    '/bookings',
    createBookingRouter({
      bookingRepository: deps.bookingRepository,
      packageRepository: deps.packageRepository,
      creatorRepository: deps.creatorRepository,
      auditRepository: deps.auditRepository,
      userRepository: deps.userRepository,
      notificationService,
    }),
  );
  // Chat độc lập với booking: một luồng cho mỗi cặp brand-creator (OD-09).
  router.use(
    '/conversations',
    createConversationRouter({
      conversationRepository: deps.conversationRepository,
      messageRepository: deps.messageRepository,
      bookingRepository: deps.bookingRepository,
      creatorRepository: deps.creatorRepository,
      userRepository: deps.userRepository,
      notificationService,
      auditRepository: deps.auditRepository,
    }),
  );
  // Nộp bài / yêu cầu sửa — cùng prefix /bookings (DLV-001..006).
  router.use(
    '/bookings',
    createSubmissionRouter({
      submissionRepository: deps.submissionRepository,
      bookingRepository: deps.bookingRepository,
      packageRepository: deps.packageRepository,
      creatorRepository: deps.creatorRepository,
      auditRepository: deps.auditRepository,
      notificationService,
    }),
  );
  router.use('/notifications', createNotificationRouter(notificationService));
  router.use(
    '/favorites',
    createFavoriteRouter({
      favoriteRepository: deps.favoriteRepository,
      creatorRepository: deps.creatorRepository,
    }),
  );
  router.use(
    '/reports',
    createReportRouter({
      reportRepository: deps.reportRepository,
      creatorRepository: deps.creatorRepository,
      packageRepository: deps.packageRepository,
      auditRepository: deps.auditRepository,
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
