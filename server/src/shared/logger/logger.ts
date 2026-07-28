import { pino } from 'pino';
import { env } from '../../config/env.js';

const developmentTransport = {
  target: 'pino-pretty',
  options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
};

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
  ...(env.NODE_ENV === 'development' ? { transport: developmentTransport } : {}),
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token', '*.otp'],
    censor: '[REDACTED]',
  },
});
