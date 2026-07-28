import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { createV1Router, type AppDependencies } from './routes/v1.js';
import { logger } from './shared/logger/logger.js';
import { errorHandler } from './shared/middlewares/error-handler.js';
import { notFoundHandler } from './shared/middlewares/not-found.js';
import { apiRateLimiter } from './shared/middlewares/rate-limiter.js';

const JSON_BODY_LIMIT = '1mb';

/** App factory: nhận dependencies từ ngoài để test dễ dàng (inject fake repository). */
export const createApp = (deps: AppDependencies): Express => {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN.split(','), credentials: true }));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: JSON_BODY_LIMIT }));

  if (env.NODE_ENV !== 'test') {
    app.use(pinoHttp({ logger }));
  }

  app.use('/api/v1', apiRateLimiter, createV1Router(deps));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
