import { createApp } from './app.js';
import { createDependencies } from './bootstrap/dependencies.js';
import { env } from './config/env.js';
import { logger } from './shared/logger/logger.js';

const { dependencies, close } = await createDependencies();

const app = createApp(dependencies);

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
    // Đóng connection pool sau khi HTTP server ngừng nhận request, để request
    // đang dở vẫn còn database mà hoàn tất.
    close()
      .then(() => {
        logger.info('Server đã tắt an toàn.');
        process.exit(0);
      })
      .catch((closeError: unknown) => {
        logger.error({ err: closeError }, 'Lỗi khi đóng connection pool');
        process.exit(1);
      });
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
