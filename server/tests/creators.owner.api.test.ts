import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { DEMO_PASSWORD } from '../src/modules/users/user.seed.js';
import { buildTestAppWithUsers } from './helpers/build-test-app.js';

/**
 * T8 — Endpoint creator-owned (CRE-001..003, 005, 006, 007, 010).
 * Test flow: register/login thật → gọi /creators/me → assert transition matrix.
 * Route ordering: /me và /me/* PHẢI khớp trước /:id (nếu không "me" trúng
 * regex creatorIdParamsSchema → 400 thay vì handler owner).
 */

let app: Express;

beforeAll(async () => {
  app = await buildTestAppWithUsers();
});

let ownerSeq = 0;
const nextEmail = (): string => `owner${(ownerSeq += 1)}@test.vn`;

const loginAs = async (email: string): Promise<string> => {
  const login = await request(app).post('/api/v1/auth/login').send({ email, password: DEMO_PASSWORD });
  expect(login.status).toBe(200);
  return login.body.data.accessToken as string;
};

/** Đăng ký creator mới (chưa có hồ sơ) và trả về access token. */
const registerCreator = async (): Promise<string> => {
  const register = await request(app).post('/api/v1/auth/register').send({
    email: nextEmail(),
    password: 'MatKhau123',
    displayName: 'Creator Mới',
    role: 'creator',
  });
  expect(register.status).toBe(201);
  return register.body.data.accessToken as string;
};

const putProfile = (token: string, body: Record<string, unknown>) =>
  request(app).put('/api/v1/creators/me').set('Authorization', `Bearer ${token}`).send(body);

const submitReview = (token: string) =>
  request(app).post('/api/v1/creators/me/submit-review').set('Authorization', `Bearer ${token}`);

/** Hồ sơ đầy đủ hợp lệ theo creatorProfileBodySchema (CRE-001..006). */
const fullProfile = (): Record<string, unknown> => ({
  displayName: 'Creator Mới',
  avatarUrl: 'https://cdn.example.com/avatar.jpg',
  bio: 'Creator chuyên review quán ăn ngon và trải nghiệm dịch vụ tại Hà Nội.',
  city: 'Hà Nội',
  niches: ['f&b', 'cafe'],
  language: 'vi',
  creatorType: 'koc',
  socialAccounts: [
    {
      platform: 'tiktok',
      handle: '@creatormoi',
      url: 'https://www.tiktok.com/@creatormoi',
      followerCount: 100,
      isVerified: false,
    },
  ],
  audienceMetrics: {
    followerCount: 100,
    viewCount: 500,
    updatedAt: '2026-08-05T00:00:00.000Z',
    isSelfReported: true,
  },
  serviceMode: 'both',
});

describe('GET /api/v1/creators/me', () => {
  it('không có token → 401 — đồng thời xác nhận /me không bị /:id nuốt (AUTH-005)', async () => {
    const response = await request(app).get('/api/v1/creators/me');

    // Nếu /me bị đăng ký SAU /:id, "me" sẽ trúng regex crt_* → 400 VALIDATION_ERROR.
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('brand không có quyền creator → 403 (AUTH-005)', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const response = await request(app)
      .get('/api/v1/creators/me')
      .set('Authorization', `Bearer ${brandToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('creator@demo.vn trả hồ sơ draft có sẵn từ seed (CRE-001)', async () => {
    const token = await loginAs('creator@demo.vn');
    const response = await request(app).get('/api/v1/creators/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe('crt_demo');
    expect(response.body.data.status).toBe('draft');
    expect(response.body.data.displayName).toBe('Creator Demo');
  });

  it('creator mới đăng ký chưa có hồ sơ → 404 PROFILE_NOT_FOUND (CRE-001)', async () => {
    const token = await registerCreator();
    const response = await request(app).get('/api/v1/creators/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('PROFILE_NOT_FOUND');
  });

  it('owner DTO không lộ userId/userEmail/passwordHash (CRE-009)', async () => {
    const token = await loginAs('creator@demo.vn');
    const response = await request(app).get('/api/v1/creators/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).not.toHaveProperty('userId');
    expect(response.body.data).not.toHaveProperty('userEmail');
    expect(response.body.data).not.toHaveProperty('passwordHash');
  });
});

describe('PUT /api/v1/creators/me', () => {
  it('chưa có hồ sơ → tạo mới ở trạng thái draft và persist (CRE-001)', async () => {
    const token = await registerCreator();
    const put = await putProfile(token, fullProfile());

    expect(put.status).toBe(200);
    expect(put.body.data.status).toBe('draft');
    expect(put.body.data.id).toMatch(/^crt_/);

    const get = await request(app).get('/api/v1/creators/me').set('Authorization', `Bearer ${token}`);
    expect(get.body.data.status).toBe('draft');
    expect(get.body.data.displayName).toBe('Creator Mới');
  });

  it('hồ sơ draft → cập nhật giữ nguyên status (CRE-002)', async () => {
    const token = await loginAs('creator@demo.vn');
    const put = await putProfile(token, { ...fullProfile(), displayName: 'Creator Demo Mới' });

    expect(put.status).toBe(200);
    expect(put.body.data.status).toBe('draft');
    expect(put.body.data.displayName).toBe('Creator Demo Mới');
  });

  it('social account không được đặt isVerified true — chỉ admin/seed (CRE-002)', async () => {
    const token = await registerCreator();
    const body = fullProfile();
    const socials = body.socialAccounts as Array<Record<string, unknown>>;
    socials[0]!.isVerified = true;

    const put = await putProfile(token, body);
    expect(put.status).toBe(400);
    expect(put.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('body thiếu trường bắt buộc → 400 VALIDATION_ERROR (CRE-002)', async () => {
    const token = await registerCreator();
    const put = await putProfile(token, { displayName: 'X' });

    expect(put.status).toBe(400);
    expect(put.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('hồ sơ đang pending_review → 409 PROFILE_LOCKED (CRE-007)', async () => {
    const token = await registerCreator();
    await putProfile(token, fullProfile());
    await submitReview(token);

    const put = await putProfile(token, fullProfile());
    expect(put.status).toBe(409);
    expect(put.body.error.code).toBe('PROFILE_LOCKED');
  });
});

describe('POST /api/v1/creators/me/submit-review', () => {
  it('draft đủ thông tin → pending_review (CRE-001)', async () => {
    const token = await registerCreator();
    await putProfile(token, fullProfile());

    const submit = await submitReview(token);
    expect(submit.status).toBe(200);
    expect(submit.body.data.status).toBe('pending_review');
  });

  it('draft thiếu avatarUrl → 400 PROFILE_INCOMPLETE (CRE-001)', async () => {
    const token = await registerCreator();
    const body = fullProfile();
    delete body.avatarUrl;
    await putProfile(token, body);

    const submit = await submitReview(token);
    expect(submit.status).toBe(400);
    expect(submit.body.error.code).toBe('PROFILE_INCOMPLETE');
  });

  it('đã pending_review → gửi duyệt lại 409 PROFILE_LOCKED (CRE-007)', async () => {
    const token = await registerCreator();
    await putProfile(token, fullProfile());
    await submitReview(token);

    const again = await submitReview(token);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('PROFILE_LOCKED');
  });

  it('chưa có hồ sơ → 404 PROFILE_NOT_FOUND (CRE-001)', async () => {
    const token = await registerCreator();
    const submit = await submitReview(token);

    expect(submit.status).toBe(404);
    expect(submit.body.error.code).toBe('PROFILE_NOT_FOUND');
  });
});

describe('PATCH /api/v1/creators/me/availability', () => {
  it('cập nhật availableDays/isPaused và persist (CRE-010)', async () => {
    const token = await loginAs('creator@demo.vn');
    const patch = await request(app)
      .patch('/api/v1/creators/me/availability')
      .set('Authorization', `Bearer ${token}`)
      .send({ availableDays: ['mon', 'tue', 'sat'], isPaused: true });

    expect(patch.status).toBe(200);
    expect(patch.body.data.availability).toEqual({
      availableDays: ['mon', 'tue', 'sat'],
      isPaused: true,
    });

    const get = await request(app).get('/api/v1/creators/me').set('Authorization', `Bearer ${token}`);
    expect(get.body.data.availability.isPaused).toBe(true);
  });

  it('chưa có hồ sơ → 404 PROFILE_NOT_FOUND (CRE-010)', async () => {
    const token = await registerCreator();
    const patch = await request(app)
      .patch('/api/v1/creators/me/availability')
      .set('Authorization', `Bearer ${token}`)
      .send({ availableDays: [], isPaused: false });

    expect(patch.status).toBe(404);
    expect(patch.body.error.code).toBe('PROFILE_NOT_FOUND');
  });

  it('availableDays không hợp lệ → 400 VALIDATION_ERROR (CRE-010)', async () => {
    const token = await loginAs('creator@demo.vn');
    const patch = await request(app)
      .patch('/api/v1/creators/me/availability')
      .set('Authorization', `Bearer ${token}`)
      .send({ availableDays: ['noday'], isPaused: false });

    expect(patch.status).toBe(400);
    expect(patch.body.error.code).toBe('VALIDATION_ERROR');
  });
});
