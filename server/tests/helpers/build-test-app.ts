import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { InMemoryAuditRepository } from '../../src/modules/audit/audit.repository.memory.js';
import type { AuditRepository } from '../../src/modules/audit/audit.repository.js';
import { InMemorySessionRepository } from '../../src/modules/auth/session.repository.memory.js';
import type { SessionRepository } from '../../src/modules/auth/session.repository.js';
import { InMemoryBrandRepository } from '../../src/modules/brands/brand.repository.memory.js';
import { BRAND_SEED } from '../../src/modules/brands/brand.seed.js';
import type { Brand } from '../../src/modules/brands/brand.types.js';
import { InMemoryVerificationTokenRepository } from '../../src/modules/auth/verification.repository.memory.js';
import type { VerificationTokenRepository } from '../../src/modules/auth/verification.repository.js';
import { InMemoryBookingRepository } from '../../src/modules/bookings/booking.repository.memory.js';
import { InMemoryConversationRepository } from '../../src/modules/conversations/conversation.repository.memory.js';
import { InMemoryMessageRepository } from '../../src/modules/messages/message.repository.memory.js';
import { InMemorySubmissionRepository } from '../../src/modules/submissions/submission.repository.memory.js';
import { InMemoryNotificationRepository } from '../../src/modules/notifications/notification.repository.memory.js';
import { InMemoryCreatorRepository } from '../../src/modules/creators/creator.repository.memory.js';
import { InMemoryFavoriteRepository } from '../../src/modules/favorites/favorite.repository.memory.js';
import { InMemoryReportRepository } from '../../src/modules/reports/report.repository.memory.js';
import { CREATOR_SEED } from '../../src/modules/creators/creator.seed.js';
import type { Creator } from '../../src/modules/creators/creator.types.js';
import { InMemoryPackageRepository } from '../../src/modules/packages/package.repository.memory.js';
import { PACKAGE_SEED } from '../../src/modules/packages/package.seed.js';
import type { ServicePackage } from '../../src/modules/packages/package.types.js';
import { InMemoryUserRepository } from '../../src/modules/users/user.repository.memory.js';
import type { UserRepository } from '../../src/modules/users/user.repository.js';
import type { User } from '../../src/modules/users/user.types.js';
import type { BookingRepository } from '../../src/modules/bookings/booking.repository.js';
import type { NotificationRepository } from '../../src/modules/notifications/notification.repository.js';
import type { Mailer } from '../../src/shared/email/mailer.js';
import type { FileStorage } from '../../src/shared/storage/file-storage.js';
import { InMemoryFileStorage } from '../../src/shared/storage/file-storage.memory.js';
import { CapturingMailer } from './capturing-mailer.js';

export interface TestAppOptions {
  readonly creators?: readonly Creator[];
  readonly packages?: readonly ServicePackage[];
  readonly brands?: readonly Brand[];
  readonly users?: readonly User[];
  readonly audit?: AuditRepository;
  readonly fileStorage?: FileStorage;
  readonly privateFileStorage?: FileStorage;
  /** Truyền instance khi test cần thao tác trực tiếp repository. */
  readonly userRepository?: UserRepository;
  readonly sessionRepository?: SessionRepository;
  readonly verificationTokenRepository?: VerificationTokenRepository;
  readonly bookingRepository?: BookingRepository;
  readonly notificationRepository?: NotificationRepository;
  readonly mailer?: Mailer;
}

export const buildTestApp = (options: TestAppOptions = {}): Express =>
  createApp({
    creatorRepository: new InMemoryCreatorRepository(options.creators ?? CREATOR_SEED),
    packageRepository: new InMemoryPackageRepository(options.packages ?? PACKAGE_SEED),
    brandRepository: new InMemoryBrandRepository(options.brands ?? BRAND_SEED),
    bookingRepository: options.bookingRepository ?? new InMemoryBookingRepository(),
    messageRepository: new InMemoryMessageRepository(),
    conversationRepository: new InMemoryConversationRepository(),
    submissionRepository: new InMemorySubmissionRepository(),
    notificationRepository: options.notificationRepository ?? new InMemoryNotificationRepository(),
    favoriteRepository: new InMemoryFavoriteRepository(),
    reportRepository: new InMemoryReportRepository(),
    userRepository: options.userRepository ?? new InMemoryUserRepository(options.users ?? []),
    sessionRepository: options.sessionRepository ?? new InMemorySessionRepository(),
    verificationTokenRepository:
      options.verificationTokenRepository ?? new InMemoryVerificationTokenRepository(),
    auditRepository: options.audit ?? new InMemoryAuditRepository(),
    fileStorage: options.fileStorage ?? new InMemoryFileStorage(),
    privateFileStorage: options.privateFileStorage ?? new InMemoryFileStorage(),
    mailer: options.mailer ?? new CapturingMailer(),
  });
