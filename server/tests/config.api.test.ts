import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { buildTestServer } from './helpers/test-server.js';

/**
 * Cấu hình công khai — client cần để hiện trước phí nền tảng và ngày sớm nhất
 * thay vì hardcode lại, còn server vẫn là bên tính tiền cuối cùng (PAY-001).
 */
let app: Server;

beforeEach(() => {
  app = buildTestServer();
});

describe('GET /api/v1/config', () => {
  it('không cần đăng nhập và trả đủ số liệu để client ước tính', async () => {
    const response = await request(app).get('/api/v1/config');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      platformFeePercent: 12,
      platformFeeMinVnd: 50_000,
      fastDeliveryTurnaroundDays: 2,
      termsVersion: '2026-08-mvp',
    });
  });

  it('chỉ đọc — không nhận ghi', async () => {
    const response = await request(app).post('/api/v1/config').send({ platformFeePercent: 0 });
    expect(response.status).toBe(404);
  });
});
