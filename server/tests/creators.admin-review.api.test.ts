import type { Server } from 'node:http';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryAuditRepository } from '../src/modules/audit/audit.repository.memory.js';
import type { AuditRepository } from '../src/modules/audit/audit.repository.js';
import { CREATOR_SEED } from '../src/modules/creators/creator.seed.js';
import type { Creator } from '../src/modules/creators/creator.types.js';
import { buildUserSeed, DEMO_PASSWORD } from '../src/modules/users/user.seed.js';
import { buildTestServer } from './helpers/test-server.js';

/** Tạo creator pending_review phụ (clone crt_0005) để test phân trang queue. */
const clonePendingCreator = (id: string): Creator => {
  const base = CREATOR_SEED.find((creator) => creator.id === 'crt_0005');
  if (!base) throw new Error('Thiếu seed crt_0005');
  return { ...structuredClone(base), id, displayName: `Creator ${id}` };
};

let app: Server;
let auditRepository: AuditRepository;

// Mỗi test dựng app mới (state máy trạng thái + audit không rò rỉ giữa test).
beforeEach(async () => {
  auditRepository = new InMemoryAuditRepository();
  app = buildTestServer({
    users: await buildUserSeed(),
    creators: [
      ...CREATOR_SEED,
      clonePendingCreator('crt_0006'),
      clonePendingCreator('crt_0007'),
    ],
    audit: auditRepository,
  });
});

const login = async (email: string): Promise<string> => {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: DEMO_PASSWORD });
  return response.body.data.accessToken as string;
};

describe('GET /api/v1/creators/reviews — RBAC admin (AUTH-005)', () => {
  it('trả 401 khi không có access token', async () => {
    const response = await request(app).get('/api/v1/creators/reviews');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('trả 403 với token creator', async () => {
    const token = await login('creator@demo.vn');
    const response = await request(app)
      .get('/api/v1/creators/reviews')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('trả 403 với token brand', async () => {
    const token = await login('brand@demo.vn');
    const response = await request(app)
      .get('/api/v1/creators/reviews')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });
});

describe('GET /api/v1/creators/reviews — queue phân trang (CRE-008, ADM-003)', () => {
  it('trả queue pending_review mặc định kèm pagination meta (không rơi vào /:id)', async () => {
    const token = await login('admin@demo.vn');
    const response = await request(app)
      .get('/api/v1/creators/reviews')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const ids = response.body.data.map((c: { id: string }) => c.id);
    expect(ids).toEqual(['crt_0005', 'crt_0006', 'crt_0007']);
    expect(response.body.meta).toEqual({ page: 1, limit: 12, total: 3, totalPages: 1 });
  });

  it('lọc theo status=draft trả profile demo kèm userEmail gốc', async () => {
    const token = await login('admin@demo.vn');
    const response = await request(app)
      .get('/api/v1/creators/reviews?status=draft')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe('crt_demo');
    expect(response.body.data[0].userEmail).toBe('creator@demo.vn');
  });

  it('phân trang đúng với limit nhỏ', async () => {
    const token = await login('admin@demo.vn');
    const response = await request(app)
      .get('/api/v1/creators/reviews?limit=2&page=2')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });

  it('trả 400 VALIDATION_ERROR khi status không hợp lệ', async () => {
    const token = await login('admin@demo.vn');
    const response = await request(app)
      .get('/api/v1/creators/reviews?status=hacked')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/v1/creators/:id/review — approve', () => {
  it('approve profile pending → verified, khỏi queue, xuất hiện public, audit đầy đủ (CRE-008)', async () => {
    const token = await login('admin@demo.vn');

    const response = await request(app)
      .post('/api/v1/creators/crt_0005/review')
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'approve' });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('verified');

    const queue = await request(app)
      .get('/api/v1/creators/reviews')
      .set('Authorization', `Bearer ${token}`);
    const queueIds = queue.body.data.map((c: { id: string }) => c.id);
    expect(queueIds).not.toContain('crt_0005');

    const publicList = await request(app).get('/api/v1/creators');
    const publicIds = publicList.body.data.map((c: { id: string }) => c.id);
    expect(publicIds).toContain('crt_0005'); // BR-001: verified mới công khai

    const entries = await auditRepository.listByTarget('creator', 'crt_0005');
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      actorId: 'usr_demo_admin',
      action: 'creator.review.approve',
      targetType: 'creator',
      targetId: 'crt_0005',
      before: 'pending_review',
      after: 'verified',
    });
  });

  it('approve lặp trên profile đã verified → 409 (idempotency)', async () => {
    const token = await login('admin@demo.vn');
    const response = await request(app)
      .post('/api/v1/creators/crt_0001/review')
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'approve' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('trả 404 khi creator không tồn tại', async () => {
    const token = await login('admin@demo.vn');
    const response = await request(app)
      .post('/api/v1/creators/crt_9999/review')
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'approve' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('trả 401 không token / 403 token creator (AUTH-005)', async () => {
    const noToken = await request(app)
      .post('/api/v1/creators/crt_0005/review')
      .send({ action: 'approve' });
    expect(noToken.status).toBe(401);

    const creatorToken = await login('creator@demo.vn');
    const forbidden = await request(app)
      .post('/api/v1/creators/crt_0005/review')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ action: 'approve' });
    expect(forbidden.status).toBe(403);
  });
});

describe('POST /api/v1/creators/:id/review — reject', () => {
  it('reject không reason → 400 VALIDATION_ERROR', async () => {
    const token = await login('admin@demo.vn');
    const response = await request(app)
      .post('/api/v1/creators/crt_0005/review')
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'reject' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'reason' })]),
    );
  });

  it('reject kèm reason → rejected, statusReason lưu lại + audit (CRE-007)', async () => {
    const token = await login('admin@demo.vn');
    const reason = 'Nội dung không phù hợp chính sách thương hiệu.';

    const response = await request(app)
      .post('/api/v1/creators/crt_0005/review')
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'reject', reason });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('rejected');
    expect(response.body.data.statusReason).toBe(reason);

    const entries = await auditRepository.listByTarget('creator', 'crt_0005');
    expect(entries[0]).toMatchObject({
      action: 'creator.review.reject',
      before: 'pending_review',
      after: 'rejected',
      reason,
    });
  });
});

describe('POST /api/v1/creators/:id/review — request_info', () => {
  it('request_info không reason → 400 VALIDATION_ERROR', async () => {
    const token = await login('admin@demo.vn');
    const response = await request(app)
      .post('/api/v1/creators/crt_0005/review')
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'request_info' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('request_info trên pending → info_required, reason hiển thị (CRE-008)', async () => {
    const token = await login('admin@demo.vn');
    const reason = 'Cần bổ sung minh chứng follower trên TikTok.';

    const response = await request(app)
      .post('/api/v1/creators/crt_0005/review')
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'request_info', reason });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('info_required');
    expect(response.body.data.statusReason).toBe(reason);

    const entries = await auditRepository.listByTarget('creator', 'crt_0005');
    expect(entries[0]).toMatchObject({
      action: 'creator.review.request_info',
      before: 'pending_review',
      after: 'info_required',
      reason,
    });
  });
});

describe('POST /api/v1/creators/:id/review — suspend', () => {
  it('suspend không reason → 400 VALIDATION_ERROR', async () => {
    const token = await login('admin@demo.vn');
    const response = await request(app)
      .post('/api/v1/creators/crt_0001/review')
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'suspend' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('suspend profile verified → suspended kèm reason + audit', async () => {
    const token = await login('admin@demo.vn');
    const reason = 'Vi phạm điều khoản hợp tác.';

    const response = await request(app)
      .post('/api/v1/creators/crt_0001/review')
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'suspend', reason });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('suspended');
    expect(response.body.data.statusReason).toBe(reason);

    const entries = await auditRepository.listByTarget('creator', 'crt_0001');
    expect(entries[0]).toMatchObject({
      action: 'creator.review.suspend',
      before: 'verified',
      after: 'suspended',
      reason,
    });
  });

  it('suspend profile chưa verified → 409 (guard trạng thái)', async () => {
    const token = await login('admin@demo.vn');
    const response = await request(app)
      .post('/api/v1/creators/crt_0005/review')
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'suspend', reason: 'Sai trạng thái.' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });
});

describe('DTO boundary — admin vs public (CRE-009)', () => {
  it('admin DTO có userEmail nhưng public DTO không lộ', async () => {
    const token = await login('admin@demo.vn');
    const queue = await request(app)
      .get('/api/v1/creators/reviews?status=draft')
      .set('Authorization', `Bearer ${token}`);
    expect(queue.body.data[0].userEmail).toBe('creator@demo.vn');

    const publicList = await request(app).get('/api/v1/creators');
    for (const creator of publicList.body.data) {
      expect(creator.userEmail).toBeUndefined();
    }
  });
});

describe('POST /api/v1/creators/me/submit-review — audit log (CRE-008)', () => {
  it('submit thành công ghi audit entry creator.submit với before/after status (CRE-008)', async () => {
    const token = await login('creator@demo.vn');

    // crt_demo (draft) thiếu avatarUrl → hoàn thiện hồ sơ trước khi submit.
    const put = await request(app)
      .put('/api/v1/creators/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        displayName: 'Creator Demo',
        avatarUrl: 'https://cdn.example.com/avatar.jpg',
        bio: 'Creator demo chuyên review quán ăn và trải nghiệm dịch vụ địa phương.',
        city: 'Hà Nội',
        niches: ['f&b', 'lifestyle', 'travel'],
        language: 'vi',
        creatorType: 'koc',
        socialAccounts: [
          {
            platform: 'tiktok',
            handle: '@creatordemo',
            url: 'https://www.tiktok.com/@creatordemo',
            followerCount: 15_000,
            isVerified: false,
          },
        ],
        audienceMetrics: null,
        serviceMode: 'both',
      });
    expect(put.status).toBe(200);

    const submit = await request(app)
      .post('/api/v1/creators/me/submit-review')
      .set('Authorization', `Bearer ${token}`);
    expect(submit.status).toBe(200);
    expect(submit.body.data.status).toBe('pending_review');

    const entries = await auditRepository.listByTarget('creator', 'crt_demo');
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      actorId: 'usr_demo_creator',
      action: 'creator.submit',
      targetType: 'creator',
      targetId: 'crt_demo',
      before: 'draft',
      after: 'pending_review',
      reason: null,
    });
  });
});
