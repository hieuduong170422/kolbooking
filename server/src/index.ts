import { createApp } from './app.js';
import { UPLOADS_DIR, env } from './config/env.js';
import { InMemoryAuditRepository } from './modules/audit/audit.repository.memory.js';
import { InMemorySessionRepository } from './modules/auth/session.repository.memory.js';
import { InMemoryCreatorRepository } from './modules/creators/creator.repository.memory.js';
import { CREATOR_SEED } from './modules/creators/creator.seed.js';
import { InMemoryUserRepository } from './modules/users/user.repository.memory.js';
import { buildUserSeed } from './modules/users/user.seed.js';
import { logger } from './shared/logger/logger.js';
import { LocalDiskFileStorage } from './shared/storage/file-storage.local.js';

const userSeed = env.NODE_ENV === 'production' ? [] : await buildUserSeed();

const app = createApp({
  creatorRepository: new InMemoryCreatorRepository(CREATOR_SEED),
  userRepository: new InMemoryUserRepository(userSeed),
  sessionRepository: new InMemorySessionRepository(),
  auditRepository: new InMemoryAuditRepository(),
  fileStorage: new LocalDiskFileStorage(UPLOADS_DIR),
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
