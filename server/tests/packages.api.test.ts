import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { CREATOR_SEED } from '../src/modules/creators/creator.seed.js';
import { DEMO_PASSWORD, buildUserSeed } from '../src/modules/users/user.seed.js';
import { buildTestServer } from './helpers/test-server.js';

/**
 * T-P1 — Service package (PKG-001..PKG-008).
 * crt_demo (userId usr_demo_creator) được nâng verified để test flow publish;
 * describe BR-001 dùng app riêng giữ crt_demo ở draft.
 */

const verifiedCreators = CREATOR_SEED.map((creator) =>
  creator.id === 'crt_demo' ? { ...creator, status: 'verified' as const } : creator,
);

let app: Server;

beforeAll(async () => {
  app = buildTestServer({ users: await buildUserSeed(), creators: verifiedCreators });
});

const loginAs = async (email: string): Promise<string> => {
  const login = await request(app).post('/api/v1/auth/login').send({ email, password: DEMO_PASSWORD });
  expect(login.status).toBe(200);
  return login.body.data.accessToken as string;
};

/** Body hợp lệ theo packageBodySchema — dùng chung cho create/update. */
const validPackageBody = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  name: 'Video review đồ uống mới',
  category: 'f&b',
  platforms: ['tiktok'],
  description: 'Một video review 30-60s quay dọc giới thiệu đồ uống mới của quán, đăng kênh creator.',
  coverImageUrl: null,
  deliverables: [
    {
      type: 'video',
      quantity: 1,
      description: 'Video 30-60s dọc 9:16',
      postedOnCreatorChannel: true,
    },
  ],
  priceVnd: 800_000,
  turnaroundDays: 5,
  revisionsIncluded: 1,
  usageRights: { repost: true, paidAds: false, durationMonths: 3, channels: ['facebook'] },
  postDurationDays: 30,
  addOns: [{ type: 'fast_delivery', label: 'Giao nhanh 48h', priceVnd: 200_000 }],
  ...overrides,
});

describe('GET /api/v1/packages (public, PKG-001)', () => {
  it('trả danh sách package published của creator verified, sort giá tăng dần', async () => {
    const response = await request(app).get('/api/v1/packages?creatorId=crt_0001');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0].priceVnd).toBeLessThanOrEqual(response.body.data[1].priceVnd);
    expect(response.body.meta.total).toBe(2);
    // Public DTO không lộ trạng thái nội bộ.
    expect(response.body.data[0].status).toBeUndefined();
    expect(response.body.data[0].statusReason).toBeUndefined();
  });

  it('creator chưa verified → 404', async () => {
    const response = await request(app).get('/api/v1/packages?creatorId=crt_0005');
    expect(response.status).toBe(404);
  });

  it('thiếu creatorId → 400 VALIDATION_ERROR', async () => {
    const response = await request(app).get('/api/v1/packages');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/v1/packages/:id (public detail)', () => {
  it('trả chi tiết package published', async () => {
    const response = await request(app).get('/api/v1/packages/pkg_0001');

    expect(response.status).toBe(200);
    expect(response.body.data.package.name).toContain('Video review');
    expect(response.body.data.package.usageRights.repost).toBe(true);
  });

  it('package không tồn tại → 404', async () => {
    const response = await request(app).get('/api/v1/packages/pkg_khongton');
    expect(response.status).toBe(404);
  });
});

describe('Owner CRUD + publish flow (PKG-001, PKG-007, PKG-008)', () => {
  it('creator tạo draft → publish → sửa tăng version → unpublish', async () => {
    const token = await loginAs('creator@demo.vn');

    // Tạo draft (PKG-001) — add-on được server sinh id.
    const created = await request(app)
      .post('/api/v1/packages')
      .set('Authorization', `Bearer ${token}`)
      .send(validPackageBody());
    expect(created.status).toBe(201);
    const pkg = created.body.data.package;
    expect(pkg.status).toBe('draft');
    expect(pkg.version).toBe(1);
    expect(pkg.addOns[0].id).toMatch(/^ado_/);

    // Danh sách owner thấy draft.
    const mine = await request(app)
      .get('/api/v1/packages/me')
      .set('Authorization', `Bearer ${token}`);
    expect(mine.status).toBe(200);
    expect(mine.body.data.packages.some((item: { id: string }) => item.id === pkg.id)).toBe(true);

    // Draft chưa xuất hiện public.
    const publicBefore = await request(app).get('/api/v1/packages?creatorId=crt_demo');
    expect(publicBefore.body.data).toHaveLength(0);

    // Publish (PKG-007) — creator verified + email verified.
    const published = await request(app)
      .post(`/api/v1/packages/${pkg.id}/publish`)
      .set('Authorization', `Bearer ${token}`);
    expect(published.status).toBe(200);
    expect(published.body.data.package.status).toBe('published');

    // priceFromVnd của creator cập nhật theo package rẻ nhất (800k).
    const creatorDetail = await request(app).get('/api/v1/creators/crt_demo');
    expect(creatorDetail.body.data.priceFromVnd).toBe(800_000);

    // Sửa khi đã publish → version tăng (PKG-008).
    const updated = await request(app)
      .put(`/api/v1/packages/${pkg.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(validPackageBody({ priceVnd: 900_000 }));
    expect(updated.status).toBe(200);
    expect(updated.body.data.package.version).toBe(2);

    // Unpublish → biến mất khỏi public, priceFromVnd về 0.
    const unpublished = await request(app)
      .post(`/api/v1/packages/${pkg.id}/unpublish`)
      .set('Authorization', `Bearer ${token}`);
    expect(unpublished.status).toBe(200);
    const publicAfter = await request(app).get('/api/v1/packages?creatorId=crt_demo');
    expect(publicAfter.body.data).toHaveLength(0);
  });

  it('xóa được draft, không xóa được package đã publish (BR-015)', async () => {
    const token = await loginAs('creator@demo.vn');

    const created = await request(app)
      .post('/api/v1/packages')
      .set('Authorization', `Bearer ${token}`)
      .send(validPackageBody({ name: 'Package draft để xóa' }));
    const draftId = created.body.data.package.id;

    const deleted = await request(app)
      .delete(`/api/v1/packages/${draftId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleted.status).toBe(200);

    // Publish một package rồi thử xóa → 409.
    const created2 = await request(app)
      .post('/api/v1/packages')
      .set('Authorization', `Bearer ${token}`)
      .send(validPackageBody({ name: 'Package publish rồi xóa' }));
    const publishedId = created2.body.data.package.id;
    await request(app)
      .post(`/api/v1/packages/${publishedId}/publish`)
      .set('Authorization', `Bearer ${token}`);
    const deletePublished = await request(app)
      .delete(`/api/v1/packages/${publishedId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deletePublished.status).toBe(409);
  });

  it('giá dưới tối thiểu hoặc thiếu deliverable → 400 (PKG-003)', async () => {
    const token = await loginAs('creator@demo.vn');

    const tooCheap = await request(app)
      .post('/api/v1/packages')
      .set('Authorization', `Bearer ${token}`)
      .send(validPackageBody({ priceVnd: 10_000 }));
    expect(tooCheap.status).toBe(400);

    const noDeliverable = await request(app)
      .post('/api/v1/packages')
      .set('Authorization', `Bearer ${token}`)
      .send(validPackageBody({ deliverables: [] }));
    expect(noDeliverable.status).toBe(400);
  });

  it('brand không tạo được package (403); user chưa có hồ sơ creator → 404', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const asBrand = await request(app)
      .post('/api/v1/packages')
      .set('Authorization', `Bearer ${brandToken}`)
      .send(validPackageBody());
    expect(asBrand.status).toBe(403);

    // Đăng ký creator mới (chưa có profile) → PROFILE_NOT_FOUND.
    const registered = await request(app).post('/api/v1/auth/register').send({
      email: 'chuacoprofile@test.vn',
      password: 'MatKhau123',
      displayName: 'Chưa Có Profile',
      role: 'creator',
      termsAccepted: true,
    });
    const newToken = registered.body.data.accessToken as string;
    const noProfile = await request(app)
      .post('/api/v1/packages')
      .set('Authorization', `Bearer ${newToken}`)
      .send(validPackageBody());
    expect(noProfile.status).toBe(404);
    expect(noProfile.body.error.code).toBe('PROFILE_NOT_FOUND');
  });
});

describe('BR-001 — creator chưa verified không publish được', () => {
  it('tạo draft OK nhưng publish trả 409', async () => {
    // App riêng: crt_demo giữ nguyên status draft như seed gốc.
    const draftApp = buildTestServer({ users: await buildUserSeed() });
    const login = await request(draftApp)
      .post('/api/v1/auth/login')
      .send({ email: 'creator@demo.vn', password: DEMO_PASSWORD });
    const token = login.body.data.accessToken as string;

    const created = await request(draftApp)
      .post('/api/v1/packages')
      .set('Authorization', `Bearer ${token}`)
      .send(validPackageBody());
    expect(created.status).toBe(201);

    const published = await request(draftApp)
      .post(`/api/v1/packages/${created.body.data.package.id}/publish`)
      .set('Authorization', `Bearer ${token}`);
    expect(published.status).toBe(409);
    expect(published.body.error.message).toContain('BR-001');
  });
});
