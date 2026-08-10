import { PRIVATE_UPLOADS_DIR, UPLOADS_DIR, env } from '../config/env.js';
import { InMemoryAuditRepository } from '../modules/audit/audit.repository.memory.js';
import { PostgresAuditRepository } from '../modules/audit/audit.repository.pg.js';
import { InMemorySessionRepository } from '../modules/auth/session.repository.memory.js';
import { PostgresSessionRepository } from '../modules/auth/session.repository.pg.js';
import { InMemoryVerificationTokenRepository } from '../modules/auth/verification.repository.memory.js';
import { PostgresVerificationTokenRepository } from '../modules/auth/verification.repository.pg.js';
import { InMemoryBookingRepository } from '../modules/bookings/booking.repository.memory.js';
import { PostgresBookingRepository } from '../modules/bookings/booking.repository.pg.js';
import { InMemoryBrandRepository } from '../modules/brands/brand.repository.memory.js';
import { PostgresBrandRepository } from '../modules/brands/brand.repository.pg.js';
import { BRAND_SEED } from '../modules/brands/brand.seed.js';
import { InMemoryConversationRepository } from '../modules/conversations/conversation.repository.memory.js';
import { PostgresConversationRepository } from '../modules/conversations/conversation.repository.pg.js';
import { InMemoryCreatorRepository } from '../modules/creators/creator.repository.memory.js';
import { PostgresCreatorRepository } from '../modules/creators/creator.repository.pg.js';
import { CREATOR_SEED } from '../modules/creators/creator.seed.js';
import { InMemoryFavoriteRepository } from '../modules/favorites/favorite.repository.memory.js';
import { PostgresFavoriteRepository } from '../modules/favorites/favorite.repository.pg.js';
import { InMemoryMessageRepository } from '../modules/messages/message.repository.memory.js';
import { PostgresMessageRepository } from '../modules/messages/message.repository.pg.js';
import { InMemoryNotificationRepository } from '../modules/notifications/notification.repository.memory.js';
import { PostgresNotificationRepository } from '../modules/notifications/notification.repository.pg.js';
import { InMemoryPackageRepository } from '../modules/packages/package.repository.memory.js';
import { PostgresPackageRepository } from '../modules/packages/package.repository.pg.js';
import { PACKAGE_SEED } from '../modules/packages/package.seed.js';
import { InMemoryReportRepository } from '../modules/reports/report.repository.memory.js';
import { PostgresReportRepository } from '../modules/reports/report.repository.pg.js';
import { InMemorySubmissionRepository } from '../modules/submissions/submission.repository.memory.js';
import { PostgresSubmissionRepository } from '../modules/submissions/submission.repository.pg.js';
import { InMemoryUserRepository } from '../modules/users/user.repository.memory.js';
import { PostgresUserRepository } from '../modules/users/user.repository.pg.js';
import { buildUserSeed } from '../modules/users/user.seed.js';
import type { AppDependencies } from '../routes/v1.js';
import { ConsoleMailer } from '../shared/email/mailer.js';
import { migrate } from '../shared/db/migrate.js';
import { createPool } from '../shared/db/pool.js';
import { logger } from '../shared/logger/logger.js';
import { LocalDiskFileStorage } from '../shared/storage/file-storage.local.js';

export interface Bootstrapped {
  readonly dependencies: AppDependencies;
  /** Đóng tài nguyên nền (connection pool) khi tắt server. */
  readonly close: () => Promise<void>;
}

/**
 * Dữ liệu demo (tài khoản admin/brand/creator dùng chung một mật khẩu công
 * khai) chỉ được nạp khi chạy ngoài production, hoặc khi bật cờ SEED_DEMO_DATA
 * cho môi trường thử nghiệm. Chạy thật thì tắt cờ, nếu không mật khẩu demo trở
 * thành cửa sau.
 */
const shouldSeedDemoData = (): boolean => env.SEED_DEMO_DATA || env.NODE_ENV !== 'production';

const createInMemoryDependencies = async (): Promise<Bootstrapped> => {
  const userSeed = shouldSeedDemoData() ? await buildUserSeed() : [];

  return {
    dependencies: {
      creatorRepository: new InMemoryCreatorRepository(CREATOR_SEED),
      packageRepository: new InMemoryPackageRepository(PACKAGE_SEED),
      brandRepository: new InMemoryBrandRepository(BRAND_SEED),
      bookingRepository: new InMemoryBookingRepository(),
      messageRepository: new InMemoryMessageRepository(),
      conversationRepository: new InMemoryConversationRepository(),
      submissionRepository: new InMemorySubmissionRepository(),
      notificationRepository: new InMemoryNotificationRepository(),
      favoriteRepository: new InMemoryFavoriteRepository(),
      reportRepository: new InMemoryReportRepository(),
      userRepository: new InMemoryUserRepository(userSeed),
      sessionRepository: new InMemorySessionRepository(),
      verificationTokenRepository: new InMemoryVerificationTokenRepository(),
      auditRepository: new InMemoryAuditRepository(),
      fileStorage: new LocalDiskFileStorage(UPLOADS_DIR),
      privateFileStorage: new LocalDiskFileStorage(PRIVATE_UPLOADS_DIR),
      // Dev: OTP in ra console. Thay adapter thật trước khi mở pilot (NTF-002).
      mailer: new ConsoleMailer(),
    },
    close: () => Promise.resolve(),
  };
};

const createPostgresDependencies = async (connectionString: string): Promise<Bootstrapped> => {
  const pool = createPool({ connectionString, max: env.DATABASE_POOL_MAX });
  await migrate(pool);

  const creatorRepository = new PostgresCreatorRepository(pool);
  const packageRepository = new PostgresPackageRepository(pool);
  const brandRepository = new PostgresBrandRepository(pool);
  const userRepository = new PostgresUserRepository(pool);

  if (shouldSeedDemoData()) {
    // insertMany bỏ qua bản ghi trùng id nên chạy lại mỗi lần khởi động là an toàn.
    await creatorRepository.insertMany(CREATOR_SEED);
    await packageRepository.insertMany(PACKAGE_SEED);
    await brandRepository.insertMany(BRAND_SEED);
    await userRepository.insertMany(await buildUserSeed());
    logger.info('Đã nạp dữ liệu demo vào database.');
  }

  return {
    dependencies: {
      creatorRepository,
      packageRepository,
      brandRepository,
      userRepository,
      bookingRepository: new PostgresBookingRepository(pool),
      messageRepository: new PostgresMessageRepository(pool),
      conversationRepository: new PostgresConversationRepository(pool),
      submissionRepository: new PostgresSubmissionRepository(pool),
      notificationRepository: new PostgresNotificationRepository(pool),
      favoriteRepository: new PostgresFavoriteRepository(pool),
      reportRepository: new PostgresReportRepository(pool),
      sessionRepository: new PostgresSessionRepository(pool),
      verificationTokenRepository: new PostgresVerificationTokenRepository(pool),
      auditRepository: new PostgresAuditRepository(pool),
      fileStorage: new LocalDiskFileStorage(UPLOADS_DIR),
      privateFileStorage: new LocalDiskFileStorage(PRIVATE_UPLOADS_DIR),
      mailer: new ConsoleMailer(),
    },
    close: () => pool.end(),
  };
};

/**
 * Chọn tầng lưu trữ theo cấu hình: có DATABASE_URL thì dùng PostgreSQL, không
 * thì chạy in-memory. In-memory tiện cho dev và test nhưng mất sạch dữ liệu
 * mỗi lần restart — đừng dùng cho môi trường có người dùng thật.
 */
export const createDependencies = async (): Promise<Bootstrapped> => {
  if (!env.DATABASE_URL) {
    logger.warn('Chưa cấu hình DATABASE_URL — chạy in-memory, dữ liệu mất khi restart.');
    return createInMemoryDependencies();
  }

  logger.info('Kết nối PostgreSQL và áp schema...');
  return createPostgresDependencies(env.DATABASE_URL);
};
