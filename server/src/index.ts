import { createApp } from './app.js';
import { env } from './config/env.js';
import { InMemoryCreatorRepository } from './modules/creators/creator.repository.memory.js';
import { CREATOR_SEED } from './modules/creators/creator.seed.js';
import { logger } from './shared/logger/logger.js';

const app = createApp({
  creatorRepository: new InMemoryCreatorRepository(CREATOR_SEED),
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
