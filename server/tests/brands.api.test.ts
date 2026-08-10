import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { InMemoryAuditRepository } from '../src/modules/audit/audit.repository.memory.js';
import { DEMO_PASSWORD, buildUserSeed } from '../src/modules/users/user.seed.js';
import { CapturingMailer } from './helpers/capturing-mailer.js';
import { buildTestApp } from './helpers/build-test-app.js';

/**
 * T-P1 — Hồ sơ brand (BRD-001..BRD-005, BRD-007).
 * Flow chính: đăng ký brand mới → verify email → tạo hồ sơ → upload giấy tờ
 * → gửi duyệt → admin approve → sửa hồ sơ → quay lại pending_review.
 */

let app: Express;
let mailer: CapturingMailer;
let audit: InMemoryAuditRepository;

// PNG 1x1 tối giản — đủ hợp lệ với whitelist image/png.
const PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

beforeEach(async () => {
  mailer = new CapturingMailer();
  audit = new InMemoryAuditRepository();
  app = buildTestApp({ users: await buildUserSeed(), mailer, audit, brands: [] });
});

const loginAs = async (email: string): Promise<string> => {
  const login = await request(app).post('/api/v1/auth/login').send({ email, password: DEMO_PASSWORD });
  expect(login.status).toBe(200);
  return login.body.data.accessToken as string;
};

/** Đăng ký brand mới + verify email → token sẵn sàng cho flow giao dịch. */
const registerVerifiedBrand = async (email: string): Promise<string> => {
  const registered = await request(app).post('/api/v1/auth/register').send({
    email,
    password: 'MatKhau123',
    displayName: 'Brand Mới',
    role: 'brand',
    termsAccepted: true,
  });
  expect(registered.status).toBe(201);
  const token = registered.body.data.accessToken as string;
  const verify = await request(app)
    .post('/api/v1/auth/verify-email/confirm')
    .set('Authorization', `Bearer ${token}`)
    .send({ code: mailer.lastOtpFor(email) });
  expect(verify.status).toBe(200);
  return token;
};

const validProfileBody = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  name: 'Quán Cà Phê Sáng',
  logoUrl: null,
  industry: 'f&b',
  website: 'https://casangcafe.example.vn',
  socialLinks: ['https://www.facebook.com/casangcafe'],
  businessAddress: '25 Tràng Thi, Hoàn Kiếm, Hà Nội',
  entityType: 'household',
  contact: { name: 'Nguyễn Văn An', email: 'an@casang.vn', phone: '0987654321' },
  ...overrides,
});

const uploadDoc = (token: string) =>
  request(app)
    .post('/api/v1/brands/me/documents')
    .set('Authorization', `Bearer ${token}`)
    .attach('file', PNG_BUFFER, { filename: 'giay-phep-kinh-doanh.png', contentType: 'image/png' });

describe('Hồ sơ brand — owner flow (BRD-001, BRD-004)', () => {
  it('chưa có hồ sơ → GET /brands/me trả 404 PROFILE_NOT_FOUND', async () => {
    const token = await registerVerifiedBrand('brandmoi1@test.vn');
    const response = await request(app)
      .get('/api/v1/brands/me')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('PROFILE_NOT_FOUND');
  });

  it('PUT /brands/me tạo hồ sơ draft; contact không bị công khai ở đâu khác', async () => {
    const token = await registerVerifiedBrand('brandmoi2@test.vn');
    const response = await request(app)
      .put('/api/v1/brands/me')
      .set('Authorization', `Bearer ${token}`)
      .send(validProfileBody());

    expect(response.status).toBe(200);
    expect(response.body.data.brand.status).toBe('draft');
    expect(response.body.data.brand.entityType).toBe('household');
    expect(response.body.data.brand.contact.phone).toBe('0987654321');
  });

  it('validation: thiếu contact hoặc SĐT sai định dạng → 400', async () => {
    const token = await registerVerifiedBrand('brandmoi3@test.vn');

    const noContact = validProfileBody();
    delete (noContact as Record<string, unknown>)['contact'];
    const missing = await request(app)
      .put('/api/v1/brands/me')
      .set('Authorization', `Bearer ${token}`)
      .send(noContact);
    expect(missing.status).toBe(400);

    const badPhone = await request(app)
      .put('/api/v1/brands/me')
      .set('Authorization', `Bearer ${token}`)
      .send(validProfileBody({ contact: { name: 'An', email: 'an@casang.vn', phone: '123' } }));
    expect(badPhone.status).toBe(400);
  });

  it('creator không truy cập được API brand → 403', async () => {
    const creatorToken = await loginAs('creator@demo.vn');
    const response = await request(app)
      .get('/api/v1/brands/me')
      .set('Authorization', `Bearer ${creatorToken}`);
    expect(response.status).toBe(403);
  });
});

describe('Giấy tờ xác minh + gửi duyệt (BRD-003, BRD-004)', () => {
  it('submit khi chưa có giấy tờ → 400; upload xong submit → pending_review + audit', async () => {
    const token = await registerVerifiedBrand('brandmoi4@test.vn');
    await request(app)
      .put('/api/v1/brands/me')
      .set('Authorization', `Bearer ${token}`)
      .send(validProfileBody());

    const submitEarly = await request(app)
      .post('/api/v1/brands/me/submit-review')
      .set('Authorization', `Bearer ${token}`);
    expect(submitEarly.status).toBe(400);
    expect(submitEarly.body.error.code).toBe('PROFILE_INCOMPLETE');

    const uploaded = await uploadDoc(token);
    expect(uploaded.status).toBe(200);
    expect(uploaded.body.data.brand.verificationDocs).toHaveLength(1);
    expect(uploaded.body.data.brand.verificationDocs[0].fileName).toBe('giay-phep-kinh-doanh.png');
    // DTO không lộ storage key thật (BRD-003).
    expect(uploaded.body.data.brand.verificationDocs[0].storageKey).toBe('');

    const submitted = await request(app)
      .post('/api/v1/brands/me/submit-review')
      .set('Authorization', `Bearer ${token}`);
    expect(submitted.status).toBe(200);
    expect(submitted.body.data.brand.status).toBe('pending_review');

    const brandId = submitted.body.data.brand.id as string;
    const entries = await audit.listByTarget('brand', brandId);
    expect(entries.some((entry) => entry.action === 'brand.submit')).toBe(true);

    // Đang pending_review thì không sửa hồ sơ được (khóa).
    const editWhilePending = await request(app)
      .put('/api/v1/brands/me')
      .set('Authorization', `Bearer ${token}`)
      .send(validProfileBody({ name: 'Đổi tên khi đang duyệt' }));
    expect(editWhilePending.status).toBe(409);
  });

  it('file giấy tờ là PRIVATE: admin và chính chủ đọc được, người khác 403, không có ở /uploads', async () => {
    const token = await registerVerifiedBrand('brandmoi5@test.vn');
    await request(app)
      .put('/api/v1/brands/me')
      .set('Authorization', `Bearer ${token}`)
      .send(validProfileBody());
    const uploaded = await uploadDoc(token);
    const brandId = uploaded.body.data.brand.id as string;
    const docId = uploaded.body.data.brand.verificationDocs[0].id as string;

    // Chính chủ đọc được.
    const asOwner = await request(app)
      .get(`/api/v1/brands/${brandId}/documents/${docId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(asOwner.status).toBe(200);
    expect(asOwner.headers['content-type']).toContain('image/png');

    // Admin đọc được.
    const adminToken = await loginAs('admin@demo.vn');
    const asAdmin = await request(app)
      .get(`/api/v1/brands/${brandId}/documents/${docId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(asAdmin.status).toBe(200);

    // Creator (không liên quan) → 403.
    const creatorToken = await loginAs('creator@demo.vn');
    const asStranger = await request(app)
      .get(`/api/v1/brands/${brandId}/documents/${docId}`)
      .set('Authorization', `Bearer ${creatorToken}`);
    expect(asStranger.status).toBe(403);

    // Chưa đăng nhập → 401.
    const asGuest = await request(app).get(`/api/v1/brands/${brandId}/documents/${docId}`);
    expect(asGuest.status).toBe(401);
  });

  it('file không phải ảnh bị từ chối (SEC-005)', async () => {
    const token = await registerVerifiedBrand('brandmoi6@test.vn');
    await request(app)
      .put('/api/v1/brands/me')
      .set('Authorization', `Bearer ${token}`)
      .send(validProfileBody());

    const response = await request(app)
      .post('/api/v1/brands/me/documents')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('%PDF-1.4 fake'), {
        filename: 'giayto.pdf',
        contentType: 'application/pdf',
      });
    expect(response.status).toBe(400);
  });
});

describe('Admin duyệt brand (BRD-007)', () => {
  /** Tạo brand pending_review, trả về brandId. */
  const buildPendingBrand = async (email: string): Promise<string> => {
    const token = await registerVerifiedBrand(email);
    await request(app)
      .put('/api/v1/brands/me')
      .set('Authorization', `Bearer ${token}`)
      .send(validProfileBody());
    await uploadDoc(token);
    const submitted = await request(app)
      .post('/api/v1/brands/me/submit-review')
      .set('Authorization', `Bearer ${token}`);
    return submitted.body.data.brand.id as string;
  };

  it('queue liệt kê brand pending kèm userEmail; approve → verified + audit', async () => {
    const brandId = await buildPendingBrand('brandduyet1@test.vn');
    const adminToken = await loginAs('admin@demo.vn');

    const queue = await request(app)
      .get('/api/v1/brands/reviews?status=pending_review')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(queue.status).toBe(200);
    const queued = queue.body.data.find((item: { id: string }) => item.id === brandId);
    expect(queued).toBeDefined();
    expect(queued.userEmail).toBe('brandduyet1@test.vn');

    const approved = await request(app)
      .post(`/api/v1/brands/${brandId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'approve' });
    expect(approved.status).toBe(200);
    expect(approved.body.data.brand.status).toBe('verified');

    const entries = await audit.listByTarget('brand', brandId);
    expect(entries.some((entry) => entry.action === 'brand.review.approve')).toBe(true);

    // Approve lần hai → 409 (guard idempotency).
    const again = await request(app)
      .post(`/api/v1/brands/${brandId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'approve' });
    expect(again.status).toBe(409);
  });

  it('reject bắt buộc reason; sửa hồ sơ sau verified → quay lại pending_review', async () => {
    const brandId = await buildPendingBrand('brandduyet2@test.vn');
    const adminToken = await loginAs('admin@demo.vn');

    const noReason = await request(app)
      .post(`/api/v1/brands/${brandId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'reject' });
    expect(noReason.status).toBe(400);

    await request(app)
      .post(`/api/v1/brands/${brandId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'approve' });

    // Chính chủ sửa hồ sơ sau khi verified → pending_review (duyệt lại).
    const ownerLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'brandduyet2@test.vn', password: 'MatKhau123' });
    const ownerToken = ownerLogin.body.data.accessToken as string;
    const updated = await request(app)
      .put('/api/v1/brands/me')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(validProfileBody({ name: 'Tên Mới Sau Duyệt' }));
    expect(updated.status).toBe(200);
    expect(updated.body.data.brand.status).toBe('pending_review');
  });

  it('non-admin không gọi được queue/review → 403', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const queue = await request(app)
      .get('/api/v1/brands/reviews')
      .set('Authorization', `Bearer ${brandToken}`);
    expect(queue.status).toBe(403);
  });
});
