import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { InMemoryAuditRepository } from '../src/modules/audit/audit.repository.memory.js';
import { DEMO_PASSWORD, buildUserSeed } from '../src/modules/users/user.seed.js';
import { buildTestServer } from './helpers/test-server.js';

/**
 * T-ADM — Quản lý tài khoản người dùng (ADM-002, ADM-004, AUTH-006).
 * Khóa TÀI KHOẢN (User.status) khác với tạm khóa HỒ SƠ creator/brand:
 * khóa tài khoản chặn đăng nhập và thu hồi toàn bộ phiên đang mở.
 */

let app: Server;
let audit: InMemoryAuditRepository;

beforeEach(async () => {
  audit = new InMemoryAuditRepository();
  app = buildTestServer({ users: await buildUserSeed(), audit });
});

const loginAs = async (email: string): Promise<string> => {
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: DEMO_PASSWORD });
  expect(login.status).toBe(200);
  return login.body.data.accessToken as string;
};

describe('GET /api/v1/users (ADM-002)', () => {
  it('admin xem được danh sách user có phân trang', async () => {
    const token = await loginAs('admin@demo.vn');
    const response = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThanOrEqual(4);
    expect(response.body.meta.total).toBeGreaterThanOrEqual(4);
    // DTO admin có status + emailVerified, tuyệt đối không có passwordHash.
    const first = response.body.data[0];
    expect(first.status).toBeDefined();
    expect(first.passwordHash).toBeUndefined();
  });

  it('tìm theo email và lọc theo role/status', async () => {
    const token = await loginAs('admin@demo.vn');

    const bySearch = await request(app)
      .get('/api/v1/users?search=creator@demo')
      .set('Authorization', `Bearer ${token}`);
    expect(bySearch.status).toBe(200);
    expect(bySearch.body.data).toHaveLength(1);
    expect(bySearch.body.data[0].email).toBe('creator@demo.vn');

    const byRole = await request(app)
      .get('/api/v1/users?role=brand')
      .set('Authorization', `Bearer ${token}`);
    expect(byRole.body.data.every((user: { role: string }) => user.role === 'brand')).toBe(true);

    const byStatus = await request(app)
      .get('/api/v1/users?status=locked')
      .set('Authorization', `Bearer ${token}`);
    expect(byStatus.body.data).toHaveLength(1);
    expect(byStatus.body.data[0].email).toBe('locked@demo.vn');
  });

  it('creator/brand không xem được danh sách user → 403', async () => {
    const creatorToken = await loginAs('creator@demo.vn');
    const response = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${creatorToken}`);
    expect(response.status).toBe(403);
  });

  it('chưa đăng nhập → 401', async () => {
    const response = await request(app).get('/api/v1/users');
    expect(response.status).toBe(401);
  });
});

describe('POST /api/v1/users/:id/lock (ADM-004, AUTH-006)', () => {
  it('khóa tài khoản: chặn đăng nhập, thu hồi phiên đang mở, ghi audit', async () => {
    const adminToken = await loginAs('admin@demo.vn');

    // Creator đang có phiên hợp lệ trước khi bị khóa.
    const creatorLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'creator@demo.vn', password: DEMO_PASSWORD });
    const creatorCookie = (creatorLogin.headers['set-cookie'] as unknown as string[])
      .find((cookie) => cookie.startsWith('kb_refresh='))!
      .split(';')[0] as string;

    const locked = await request(app)
      .post('/api/v1/users/usr_demo_creator/lock')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Spam brand nhiều lần sau cảnh báo.' });
    expect(locked.status).toBe(200);
    expect(locked.body.data.user.status).toBe('locked');

    // Không đăng nhập lại được.
    const relogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'creator@demo.vn', password: DEMO_PASSWORD });
    expect(relogin.status).toBe(403);

    // Phiên cũ bị thu hồi (AUTH-006).
    const refresh = await request(app).post('/api/v1/auth/refresh').set('Cookie', creatorCookie);
    expect(refresh.status).toBe(401);

    const entries = await audit.listByTarget('user', 'usr_demo_creator');
    expect(entries).toHaveLength(1);
    expect(entries[0]?.action).toBe('user.lock');
    expect(entries[0]?.before).toBe('active');
    expect(entries[0]?.after).toBe('locked');
    expect(entries[0]?.reason).toContain('Spam');
  });

  it('thiếu reason → 400 (BR-014: action nhạy cảm phải có lý do)', async () => {
    const adminToken = await loginAs('admin@demo.vn');
    const response = await request(app)
      .post('/api/v1/users/usr_demo_creator/lock')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(response.status).toBe(400);
  });

  it('không khóa được tài khoản admin (kể cả chính mình) → 403', async () => {
    const adminToken = await loginAs('admin@demo.vn');
    const response = await request(app)
      .post('/api/v1/users/usr_demo_admin/lock')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Thử tự khóa tài khoản quản trị.' });
    expect(response.status).toBe(403);
  });

  it('khóa tài khoản đã khóa → 409; user không tồn tại → 404', async () => {
    const adminToken = await loginAs('admin@demo.vn');

    const already = await request(app)
      .post('/api/v1/users/usr_demo_locked/lock')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Khóa lần hai để kiểm tra guard.' });
    expect(already.status).toBe(409);

    const missing = await request(app)
      .post('/api/v1/users/usr_khongton/lock')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Tài khoản không tồn tại.' });
    expect(missing.status).toBe(404);
  });

  it('creator không khóa được người khác → 403', async () => {
    const creatorToken = await loginAs('creator@demo.vn');
    const response = await request(app)
      .post('/api/v1/users/usr_demo_brand/lock')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ reason: 'Thử khóa tài khoản người khác.' });
    expect(response.status).toBe(403);
  });
});

describe('POST /api/v1/users/:id/unlock (ADM-004)', () => {
  it('mở khóa: đăng nhập lại được + ghi audit', async () => {
    const adminToken = await loginAs('admin@demo.vn');

    const unlocked = await request(app)
      .post('/api/v1/users/usr_demo_locked/unlock')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(unlocked.status).toBe(200);
    expect(unlocked.body.data.user.status).toBe('active');

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'locked@demo.vn', password: DEMO_PASSWORD });
    expect(login.status).toBe(200);

    const entries = await audit.listByTarget('user', 'usr_demo_locked');
    expect(entries.some((entry) => entry.action === 'user.unlock')).toBe(true);
  });

  it('mở khóa tài khoản đang hoạt động → 409', async () => {
    const adminToken = await loginAs('admin@demo.vn');
    const response = await request(app)
      .post('/api/v1/users/usr_demo_brand/unlock')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(response.status).toBe(409);
  });
});
