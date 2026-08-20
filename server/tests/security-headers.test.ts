import express from 'express';
import helmet from 'helmet';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildHelmetOptions } from '../src/shared/http/security-headers.js';
import { listenTestApp } from './helpers/test-server.js';

/**
 * Header bảo mật phải bám theo giao thức thật đang phục vụ. Sai chiều này làm
 * trang trắng hoàn toàn trên HTTP: trình duyệt nâng CSS/JS lên https rồi nhận
 * ERR_SSL_PROTOCOL_ERROR.
 */
const appWith = (overHttps: boolean) => {
  const app = express();
  app.use(helmet(buildHelmetOptions(overHttps)));
  app.get('/', (_req, res) => {
    res.send('ok');
  });
  return listenTestApp(app);
};

describe('buildHelmetOptions', () => {
  describe('khi phục vụ qua HTTP trần', () => {
    it('KHÔNG ép nâng request lên https', async () => {
      const response = await request(appWith(false)).get('/');

      expect(response.headers['content-security-policy']).not.toContain(
        'upgrade-insecure-requests',
      );
    });

    it('không gửi HSTS — nếu không người dùng kẹt ở https và không vào lại được', async () => {
      const response = await request(appWith(false)).get('/');

      expect(response.headers['strict-transport-security']).toBeUndefined();
    });

    it('vẫn giữ các lớp bảo vệ khác của helmet', async () => {
      const response = await request(appWith(false)).get('/');

      // Tắt hai thứ gắn với HTTPS không có nghĩa là bỏ luôn phần còn lại.
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    });
  });

  describe('khi phục vụ qua HTTPS', () => {
    it('bật lại upgrade-insecure-requests và HSTS', async () => {
      const response = await request(appWith(true)).get('/');

      expect(response.headers['content-security-policy']).toContain(
        'upgrade-insecure-requests',
      );
      expect(response.headers['strict-transport-security']).toContain('max-age=');
    });
  });
});
