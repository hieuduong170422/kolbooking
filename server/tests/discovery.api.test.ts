import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { InMemoryAuditRepository } from '../src/modules/audit/audit.repository.memory.js';
import { DEMO_PASSWORD, buildUserSeed } from '../src/modules/users/user.seed.js';
import { buildTestServer } from './helpers/test-server.js';

/**
 * T-P2 — Discovery: lọc/sắp xếp mở rộng (SRCH-003, SRCH-004),
 * creator đã lưu (BRD-006) và báo cáo vi phạm (SRCH-007).
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

describe('Lọc và sắp xếp creator (SRCH-003, SRCH-004)', () => {
  it('lọc theo minRating chỉ trả creator đạt điểm', async () => {
    const response = await request(app).get('/api/v1/creators?minRating=4.7');

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(
      response.body.data.every((creator: { rating: number }) => creator.rating >= 4.7),
    ).toBe(true);
  });

  it('minRating ngoài thang 0-5 bị từ chối', async () => {
    const response = await request(app).get('/api/v1/creators?minRating=9');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('sort=completed xếp theo số booking hoàn thành giảm dần', async () => {
    const response = await request(app).get('/api/v1/creators?sort=completed');

    expect(response.status).toBe(200);
    const counts = response.body.data.map(
      (creator: { completedBookings: number }) => creator.completedBookings,
    );
    expect(counts).toEqual([...counts].sort((a: number, b: number) => b - a));
  });

  it('kết hợp nhiều filter cùng lúc vẫn đúng', async () => {
    const response = await request(app).get(
      '/api/v1/creators?city=Hà Nội&minRating=4&maxPrice=2000000&sort=price_asc',
    );

    expect(response.status).toBe(200);
    for (const creator of response.body.data as readonly {
      city: string;
      rating: number;
      priceFromVnd: number;
    }[]) {
      expect(creator.city).toBe('Hà Nội');
      expect(creator.rating).toBeGreaterThanOrEqual(4);
      expect(creator.priceFromVnd).toBeLessThanOrEqual(2_000_000);
    }
  });
});

describe('Creator đã lưu (BRD-006)', () => {
  it('brand lưu, xem danh sách rồi bỏ lưu', async () => {
    const token = await loginAs('brand@demo.vn');

    const empty = await request(app)
      .get('/api/v1/favorites')
      .set('Authorization', `Bearer ${token}`);
    expect(empty.status).toBe(200);
    expect(empty.body.data).toHaveLength(0);

    const saved = await request(app)
      .post('/api/v1/favorites/crt_0001')
      .set('Authorization', `Bearer ${token}`);
    expect(saved.status).toBe(200);
    expect(saved.body.data.saved).toBe(true);

    // Lưu lại lần nữa là idempotent — không nhân đôi.
    await request(app).post('/api/v1/favorites/crt_0001').set('Authorization', `Bearer ${token}`);

    const list = await request(app)
      .get('/api/v1/favorites')
      .set('Authorization', `Bearer ${token}`);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].id).toBe('crt_0001');
    // Trả public DTO — không lộ trạng thái nội bộ (CRE-009).
    expect(list.body.data[0].status).toBeUndefined();

    const removed = await request(app)
      .delete('/api/v1/favorites/crt_0001')
      .set('Authorization', `Bearer ${token}`);
    expect(removed.status).toBe(200);

    const after = await request(app)
      .get('/api/v1/favorites')
      .set('Authorization', `Bearer ${token}`);
    expect(after.body.data).toHaveLength(0);
  });

  it('creator chưa verified không lưu được → 404; creator role → 403; guest → 401', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const notVerified = await request(app)
      .post('/api/v1/favorites/crt_0005')
      .set('Authorization', `Bearer ${brandToken}`);
    expect(notVerified.status).toBe(404);

    const creatorToken = await loginAs('creator@demo.vn');
    const asCreator = await request(app)
      .get('/api/v1/favorites')
      .set('Authorization', `Bearer ${creatorToken}`);
    expect(asCreator.status).toBe(403);

    const asGuest = await request(app).get('/api/v1/favorites');
    expect(asGuest.status).toBe(401);
  });

  it('danh sách đã lưu tách biệt theo tài khoản', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    await request(app).post('/api/v1/favorites/crt_0001').set('Authorization', `Bearer ${brandToken}`);

    // Brand mới đăng ký chưa lưu gì.
    const registered = await request(app).post('/api/v1/auth/register').send({
      email: 'brandkhac@test.vn',
      password: 'MatKhau123',
      displayName: 'Brand Khác',
      role: 'brand',
      termsAccepted: true,
    });
    const otherToken = registered.body.data.accessToken as string;

    const otherList = await request(app)
      .get('/api/v1/favorites')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(otherList.body.data).toHaveLength(0);
  });
});

describe('Báo cáo vi phạm (SRCH-007)', () => {
  it('user đăng nhập tạo được ticket; admin xem queue rồi đóng ticket kèm audit', async () => {
    const brandToken = await loginAs('brand@demo.vn');

    const created = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${brandToken}`)
      .send({
        targetType: 'creator',
        targetId: 'crt_0001',
        reason: 'misleading_price',
        description: 'Giá niêm yết khác hẳn giá creator báo khi trao đổi.',
      });
    expect(created.status).toBe(201);
    expect(created.body.data.report.status).toBe('open');
    const reportId = created.body.data.report.id as string;

    const adminToken = await loginAs('admin@demo.vn');
    const queue = await request(app)
      .get('/api/v1/reports?status=open')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(queue.status).toBe(200);
    expect(queue.body.data).toHaveLength(1);

    const resolved = await request(app)
      .post(`/api/v1/reports/${reportId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'resolved', note: 'Đã nhắc creator cập nhật lại giá.' });
    expect(resolved.status).toBe(200);
    expect(resolved.body.data.report.status).toBe('resolved');

    const entries = await audit.listByTarget('report', reportId);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.action).toBe('report.resolved');

    // Đóng lần hai → 409.
    const again = await request(app)
      .post(`/api/v1/reports/${reportId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'dismissed', note: 'Thử đóng lại lần nữa.' });
    expect(again.status).toBe(409);
  });

  it('báo cáo đối tượng không tồn tại → 404; mô tả quá ngắn → 400', async () => {
    const token = await loginAs('brand@demo.vn');

    const missingTarget = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        targetType: 'creator',
        targetId: 'crt_khongton',
        reason: 'spam',
        description: 'Đối tượng này không tồn tại trong hệ thống.',
      });
    expect(missingTarget.status).toBe(404);

    const shortDescription = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        targetType: 'creator',
        targetId: 'crt_0001',
        reason: 'spam',
        description: 'ngắn',
      });
    expect(shortDescription.status).toBe(400);
  });

  it('non-admin không xem được queue báo cáo → 403', async () => {
    const token = await loginAs('brand@demo.vn');
    const response = await request(app)
      .get('/api/v1/reports')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(403);
  });
});
