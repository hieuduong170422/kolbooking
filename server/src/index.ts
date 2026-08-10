import { createApp } from './app.js';
import { PRIVATE_UPLOADS_DIR, UPLOADS_DIR, env } from './config/env.js';
import { InMemoryAuditRepository } from './modules/audit/audit.repository.memory.js';
import { InMemoryBrandRepository } from './modules/brands/brand.repository.memory.js';
import { BRAND_SEED } from './modules/brands/brand.seed.js';
import { InMemorySessionRepository } from './modules/auth/session.repository.memory.js';
import { InMemoryVerificationTokenRepository } from './modules/auth/verification.repository.memory.js';
import { InMemoryBookingRepository } from './modules/bookings/booking.repository.memory.js';
import { InMemoryCreatorRepository } from './modules/creators/creator.repository.memory.js';
import { InMemoryFavoriteRepository } from './modules/favorites/favorite.repository.memory.js';
import { InMemoryReportRepository } from './modules/reports/report.repository.memory.js';
import { CREATOR_SEED } from './modules/creators/creator.seed.js';
import { InMemoryPackageRepository } from './modules/packages/package.repository.memory.js';
import { PACKAGE_SEED } from './modules/packages/package.seed.js';
import { InMemoryUserRepository } from './modules/users/user.repository.memory.js';
import { buildUserSeed } from './modules/users/user.seed.js';
import { ConsoleMailer } from './shared/email/mailer.js';
import { logger } from './shared/logger/logger.js';
import { LocalDiskFileStorage } from './shared/storage/file-storage.local.js';

const userSeed = env.NODE_ENV === 'production' ? [] : await buildUserSeed();

const app = createApp({
  creatorRepository: new InMemoryCreatorRepository(CREATOR_SEED),
  packageRepository: new InMemoryPackageRepository(PACKAGE_SEED),
  brandRepository: new InMemoryBrandRepository(BRAND_SEED),
  bookingRepository: new InMemoryBookingRepository(),
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
});

const server = app.listen(env.PORT, () => {
  logger.info(`API server đang chạy tại http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

const shutdown = (signal: string): void => {
  logger.info(`Nhận ${signal}, đang tắt server...`);
  server.close((err) => {
    if (err) {
      logger.error({ err }, 'Lỗi khi tắt server');
      process.exit(1);
    }
    logger.info('Server đã tắt an toàn.');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
