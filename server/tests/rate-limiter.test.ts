import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApiRateLimiter } from '../src/shared/middlewares/rate-limiter.js';
import { listenTestApp } from './helpers/test-server.js';

/**
 * App tối giản: limiter bị tắt ở NODE_ENV=test nên phải dựng riêng, nếu
 * không sẽ không môi trường nào chạy qua middleware này (ngưỡng sai chỉ lộ
 * ra ở production).
 */
const appWith = (options: { enabled: boolean; limit?: number }) => {
  const app = express();
  app.use(createApiRateLimiter(options));
  app.get('/ping', (_req, res) => {
    res.json({ success: true });
  });
  return listenTestApp(app);
};

describe('apiRateLimiter', () => {
  it('trả 429 kèm mã TOO_MANY_REQUESTS khi vượt ngưỡng', async () => {
    const app = appWith({ enabled: true, limit: 2 });

    await request(app).get('/ping').expect(200);
    await request(app).get('/ping').expect(200);
    const blocked = await request(app).get('/ping').expect(429);

    expect(blocked.body.success).toBe(false);
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
  });

  it('không chặn gì khi bị tắt qua cấu hình', async () => {
    const app = appWith({ enabled: false, limit: 1 });

    await request(app).get('/ping').expect(200);
    await request(app).get('/ping').expect(200);
    await request(app).get('/ping').expect(200);
  });
});
