import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { DEMO_PASSWORD } from '../src/modules/users/user.seed.js';
import { buildTestServerWithUsers } from './helpers/test-server.js';

let app: Server;

beforeAll(async () => {
  app = await buildTestServerWithUsers();
});

const extractRefreshCookie = (response: request.Response): string => {
  const cookies = response.headers['set-cookie'] as unknown as string[] | undefined;
  const refreshCookie = cookies?.find((cookie) => cookie.startsWith('kb_refresh='));
  expect(refreshCookie).toBeDefined();
  return (refreshCookie as string).split(';')[0] as string;
};

describe('POST /api/v1/auth/register', () => {
  it('tạo tài khoản mới, trả user + accessToken và set refresh cookie', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      email: 'newbrand@test.vn',
      password: 'MatKhau123',
      displayName: 'Brand Mới',
      role: 'brand',
      termsAccepted: true,
    });

    expect(response.status).toBe(201);
    expect(response.body.data.user.email).toBe('newbrand@test.vn');
    expect(response.body.data.user.role).toBe('brand');
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(typeof response.body.data.accessToken).toBe('string');
    const refreshCookie = extractRefreshCookie(response);
    expect(refreshCookie.length).toBeGreaterThan('kb_refresh='.length);
  });

  it('từ chối email trùng với 409 CONFLICT', async () => {
    const payload = {
      email: 'creator@demo.vn',
      password: 'MatKhau123',
      displayName: 'Trùng Email',
      role: 'creator',
      termsAccepted: true,
    };
    const response = await request(app).post('/api/v1/auth/register').send(payload);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('từ chối role admin khi tự đăng ký', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      email: 'hacker@test.vn',
      password: 'MatKhau123',
      displayName: 'Hacker',
      role: 'admin',
      termsAccepted: true,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('từ chối mật khẩu yếu', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      email: 'weak@test.vn',
      password: 'ngan',
      displayName: 'Mật Khẩu Yếu',
      role: 'creator',
      termsAccepted: true,
    });

    expect(response.status).toBe(400);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('đăng nhập đúng trả user + accessToken', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'creator@demo.vn', password: DEMO_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.data.user.id).toBe('usr_demo_creator');
    expect(typeof response.body.data.accessToken).toBe('string');
  });

  it('sai mật khẩu trả 401 với message chung', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'creator@demo.vn', password: 'SaiMatKhau1' });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Email hoặc mật khẩu không đúng.');
  });

  it('email không tồn tại trả 401 cùng message (không lộ email nào có thật)', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'khongtontai@demo.vn', password: 'SaiMatKhau1' });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Email hoặc mật khẩu không đúng.');
  });

  it('tài khoản bị khóa trả 403 (AUTH-006)', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'locked@demo.vn', password: DEMO_PASSWORD });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});

describe('GET /api/v1/auth/me', () => {
  it('trả về user hiện tại với access token hợp lệ', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'brand@demo.vn', password: DEMO_PASSWORD });
    const accessToken = login.body.data.accessToken as string;

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe('brand@demo.vn');
  });

  it('trả 401 khi thiếu token', async () => {
    const response = await request(app).get('/api/v1/auth/me');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('trả 401 khi token rác', async () => {
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer khong-phai-jwt');
    expect(response.status).toBe(401);
  });
});

describe('POST /api/v1/auth/refresh — xoay vòng refresh token', () => {
  it('cấp access token mới và refresh cookie mới', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'creator@demo.vn', password: DEMO_PASSWORD });
    const oldCookie = extractRefreshCookie(login);

    const response = await request(app).post('/api/v1/auth/refresh').set('Cookie', oldCookie);

    expect(response.status).toBe(200);
    expect(typeof response.body.data.accessToken).toBe('string');
    const newCookie = extractRefreshCookie(response);
    expect(newCookie).not.toBe(oldCookie);
  });

  it('refresh token cũ bị thu hồi sau khi xoay vòng (chống replay)', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'creator@demo.vn', password: DEMO_PASSWORD });
    const oldCookie = extractRefreshCookie(login);

    await request(app).post('/api/v1/auth/refresh').set('Cookie', oldCookie);
    const replay = await request(app).post('/api/v1/auth/refresh').set('Cookie', oldCookie);

    expect(replay.status).toBe(401);
  });

  it('trả 401 khi không có cookie', async () => {
    const response = await request(app).post('/api/v1/auth/refresh');
    expect(response.status).toBe(401);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('thu hồi refresh token — refresh sau logout thất bại (AUTH-003)', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'brand@demo.vn', password: DEMO_PASSWORD });
    const cookie = extractRefreshCookie(login);

    const logout = await request(app).post('/api/v1/auth/logout').set('Cookie', cookie);
    expect(logout.status).toBe(200);
    expect(logout.body.data.loggedOut).toBe(true);

    const refreshAfter = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(refreshAfter.status).toBe(401);
  });
});
