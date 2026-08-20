import type { Server } from 'node:http';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { CREATOR_SEED } from '../src/modules/creators/creator.seed.js';
import { DEMO_PASSWORD, buildUserSeed } from '../src/modules/users/user.seed.js';
import { InMemoryFileStorage } from '../src/shared/storage/file-storage.memory.js';
import { buildTestServer } from './helpers/test-server.js';

/**
 * T10 — Portfolio + avatar upload API (CRE-004, SEC-005).
 * Test flow: đăng nhập creator@demo.vn (hồ sơ crt_demo có sẵn từ seed) →
 * upload multipart (image/video), JSON link, xóa item, avatar; RBAC (AUTH-005).
 */

let app: Server;
let fileStorage: InMemoryFileStorage;

// Mỗi test dựng app mới để file storage + repo không rò rỉ state giữa test.
beforeEach(async () => {
  fileStorage = new InMemoryFileStorage();
  app = buildTestServer({
    users: await buildUserSeed(),
    creators: CREATOR_SEED,
    fileStorage,
  });
});

const login = async (email: string): Promise<string> => {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: DEMO_PASSWORD });
  return response.body.data.accessToken as string;
};

const creatorToken = async (): Promise<string> => login('creator@demo.vn');
const brandToken = async (): Promise<string> => login('brand@demo.vn');

const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

describe('POST /api/v1/creators/me/portfolio — upload file (CRE-004, SEC-005)', () => {
  it('upload png → 201, type image, url /uploads/<uuid>.png, caption/category trim', async () => {
    const token = await creatorToken();
    const response = await request(app)
      .post('/api/v1/creators/me/portfolio')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', PNG_BYTES, { filename: 'anh-demo.png', contentType: 'image/png' })
      .field('caption', '  Review quán cà phê  ')
      .field('category', 'f&b');

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.type).toBe('image');
    expect(response.body.data.caption).toBe('Review quán cà phê');
    expect(response.body.data.category).toBe('f&b');
    expect(response.body.data.thumbnailUrl).toBeNull();
    expect(response.body.data.url).toMatch(/^\/uploads\/[0-9a-f-]+\.png$/);
  });

  it('upload text/html → 400 BAD_REQUEST từ assertValidUpload (SEC-005)', async () => {
    const token = await creatorToken();
    const response = await request(app)
      .post('/api/v1/creators/me/portfolio')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('<html><body>x</body></html>'), {
        filename: 'trang.html',
        contentType: 'text/html',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('upload video/mp4 → 201, type video (CRE-004)', async () => {
    const token = await creatorToken();
    const response = await request(app)
      .post('/api/v1/creators/me/portfolio')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('fake-mp4-bytes'), {
        filename: 'video.mp4',
        contentType: 'video/mp4',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.type).toBe('video');
    expect(response.body.data.url).toMatch(/\.mp4$/);
  });
});

describe('POST /api/v1/creators/me/portfolio — JSON link (CRE-004)', () => {
  it('send {type:link, url, caption, category} → 201, type link', async () => {
    const token = await creatorToken();
    const response = await request(app)
      .post('/api/v1/creators/me/portfolio')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'link', url: 'https://youtu.be/abc', caption: 'Review', category: 'video' });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.type).toBe('link');
    expect(response.body.data.url).toBe('https://youtu.be/abc');
    expect(response.body.data.caption).toBe('Review');
    expect(response.body.data.category).toBe('video');
  });

  it('url không hợp lệ → 400 VALIDATION_ERROR', async () => {
    const token = await creatorToken();
    const response = await request(app)
      .post('/api/v1/creators/me/portfolio')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'link', url: 'khong-phai-url' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('DELETE /api/v1/creators/me/portfolio/:itemId (CRE-004)', () => {
  it('xóa item → 200; xóa lại → 404', async () => {
    const token = await creatorToken();
    const created = await request(app)
      .post('/api/v1/creators/me/portfolio')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'link', url: 'https://youtu.be/abc' });
    const itemId = created.body.data.id as string;

    const deleted = await request(app)
      .delete(`/api/v1/creators/me/portfolio/${itemId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleted.status).toBe(200);

    const again = await request(app)
      .delete(`/api/v1/creators/me/portfolio/${itemId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(again.status).toBe(404);
    expect(again.body.error.code).toBe('NOT_FOUND');
  });

  it('xóa item upload → file cũng được xóa khỏi storage (CRE-004)', async () => {
    const token = await creatorToken();
    const created = await request(app)
      .post('/api/v1/creators/me/portfolio')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', PNG_BYTES, { filename: 'a.png', contentType: 'image/png' });
    const url = created.body.data.url as string;
    const key = url.slice('/uploads/'.length);
    expect(fileStorage.get(key)).toBeDefined();

    const deleted = await request(app)
      .delete(`/api/v1/creators/me/portfolio/${created.body.data.id as string}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleted.status).toBe(200);

    expect(fileStorage.get(key)).toBeUndefined();
  });

  it('itemId không hợp lệ → 400 VALIDATION_ERROR', async () => {
    const token = await creatorToken();
    const response = await request(app)
      .delete('/api/v1/creators/me/portfolio/abc!def')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/v1/creators/me/avatar (CRE-004)', () => {
  it('upload png → 200, avatarUrl cập nhật và lưu bền trên GET /me', async () => {
    const token = await creatorToken();
    const response = await request(app)
      .post('/api/v1/creators/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', PNG_BYTES, { filename: 'avatar.png', contentType: 'image/png' });

    expect(response.status).toBe(200);
    expect(response.body.data.avatarUrl).toMatch(/^\/uploads\/[0-9a-f-]+\.png$/);

    const me = await request(app)
      .get('/api/v1/creators/me')
      .set('Authorization', `Bearer ${token}`);
    expect(me.body.data.avatarUrl).toBe(response.body.data.avatarUrl);
  });

  it('upload video/mp4 → 400 BAD_REQUEST (avatar chỉ nhận ảnh)', async () => {
    const token = await creatorToken();
    const response = await request(app)
      .post('/api/v1/creators/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('fake-mp4-bytes'), {
        filename: 'v.mp4',
        contentType: 'video/mp4',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });
});

describe('RBAC — chỉ creator sở hữu profile (AUTH-005)', () => {
  it('không token → 401; token brand → 403', async () => {
    const noToken = await request(app)
      .post('/api/v1/creators/me/portfolio')
      .attach('file', PNG_BYTES, { filename: 'a.png', contentType: 'image/png' });
    expect(noToken.status).toBe(401);
    expect(noToken.body.error.code).toBe('UNAUTHORIZED');

    const token = await brandToken();
    const forbidden = await request(app)
      .post('/api/v1/creators/me/portfolio')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'link', url: 'https://youtu.be/abc' });
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN');
  });
});
