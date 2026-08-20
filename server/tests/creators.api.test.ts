import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildTestServer } from './helpers/test-server.js';
import { CREATOR_SEED } from '../src/modules/creators/creator.seed.js';
import type { Creator } from '../src/modules/creators/creator.types.js';

const app = buildTestServer();

// Bộ dữ liệu có đủ 3 serviceMode để test filter (CRE-006) — bản sao từ seed verified,
// chỉ đổi id/serviceMode. Default sort là rating → crt_sm_both (4.9) đứng đầu.
const serviceModeSeed: readonly Creator[] = [
  { ...structuredClone(CREATOR_SEED[0]!), id: 'crt_sm_online', serviceMode: 'online' },
  { ...structuredClone(CREATOR_SEED[1]!), id: 'crt_sm_offline', serviceMode: 'offline' },
  { ...structuredClone(CREATOR_SEED[2]!), id: 'crt_sm_both', serviceMode: 'both' },
];
const serviceModeApp = buildTestServer({ creators: serviceModeSeed });

describe('GET /api/v1/creators', () => {
  it('chỉ trả về creator verified kèm pagination meta', async () => {
    const response = await request(app).get('/api/v1/creators');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.meta).toEqual({ page: 1, limit: 12, total: 4, totalPages: 1 });
    const ids = response.body.data.map((c: { id: string }) => c.id);
    expect(ids).not.toContain('crt_0005'); // pending_review không được công khai
  });

  it('không lộ trường status nội bộ trong public DTO', async () => {
    const response = await request(app).get('/api/v1/creators');
    for (const creator of response.body.data) {
      expect(creator.status).toBeUndefined();
      expect(creator.createdAt).toBeUndefined();
      expect(creator.availability).toBeUndefined();
      expect(creator.statusReason).toBeUndefined();
      expect(creator.userId).toBeUndefined();
    }
  });

  it('public DTO chứa đủ avatarUrl/language/serviceMode/audienceMetrics/portfolioItems (CRE-009)', async () => {
    const response = await request(app).get('/api/v1/creators');
    expect(response.body.data.length).toBeGreaterThan(0);
    for (const creator of response.body.data) {
      expect(creator).toHaveProperty('avatarUrl');
      expect(creator).toHaveProperty('language');
      expect(creator).toHaveProperty('serviceMode');
      expect(creator).toHaveProperty('audienceMetrics');
      expect(creator).toHaveProperty('portfolioItems');
    }
  });

  it('filter theo city và creatorType', async () => {
    const response = await request(app).get(
      '/api/v1/creators?city=Hà Nội&creatorType=koc',
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe('crt_0001');
  });

  it('filter theo khoảng giá và sort price_asc', async () => {
    const response = await request(app).get(
      '/api/v1/creators?minPrice=700000&maxPrice=2000000&sort=price_asc',
    );

    expect(response.status).toBe(200);
    const prices = response.body.data.map((c: { priceFromVnd: number }) => c.priceFromVnd);
    expect(prices).toEqual([700_000, 900_000, 1_500_000]);
  });

  it('search theo keyword trong bio/niche', async () => {
    const response = await request(app).get('/api/v1/creators?search=ugc');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe('crt_0002');
  });

  it('phân trang đúng với limit nhỏ', async () => {
    const response = await request(app).get('/api/v1/creators?limit=2&page=2&sort=rating');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta).toEqual({ page: 2, limit: 2, total: 4, totalPages: 2 });
  });

  it('trả 400 VALIDATION_ERROR khi query không hợp lệ', async () => {
    const response = await request(app).get('/api/v1/creators?limit=999&sort=abc');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.length).toBeGreaterThan(0);
  });

  it('trả 400 khi minPrice lớn hơn maxPrice', async () => {
    const response = await request(app).get('/api/v1/creators?minPrice=500000&maxPrice=100000');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('filter serviceMode=online chỉ trả creator online hoặc both (CRE-006)', async () => {
    const response = await request(serviceModeApp).get('/api/v1/creators?serviceMode=online');

    expect(response.status).toBe(200);
    const ids = response.body.data.map((c: { id: string }) => c.id);
    expect(ids).toHaveLength(2);
    expect(ids).toEqual(expect.arrayContaining(['crt_sm_online', 'crt_sm_both']));
  });

  it('filter serviceMode=offline chỉ trả creator offline hoặc both (CRE-006)', async () => {
    const response = await request(serviceModeApp).get('/api/v1/creators?serviceMode=offline');

    expect(response.status).toBe(200);
    const ids = response.body.data.map((c: { id: string }) => c.id);
    expect(ids).toHaveLength(2);
    expect(ids).toEqual(expect.arrayContaining(['crt_sm_offline', 'crt_sm_both']));
  });

  it('filter serviceMode=both chỉ trả creator both (CRE-006)', async () => {
    const response = await request(serviceModeApp).get('/api/v1/creators?serviceMode=both');

    expect(response.status).toBe(200);
    const ids = response.body.data.map((c: { id: string }) => c.id);
    expect(ids).toEqual(['crt_sm_both']);
  });

  it('trả 400 VALIDATION_ERROR khi serviceMode không hợp lệ (CRE-006)', async () => {
    const response = await request(serviceModeApp).get('/api/v1/creators?serviceMode=abc');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/v1/creators/:id', () => {
  it('trả về chi tiết creator verified', async () => {
    const response = await request(app).get('/api/v1/creators/crt_0001');

    expect(response.status).toBe(200);
    expect(response.body.data.displayName).toBe('Lan Chi Foodie');
    expect(response.body.data.socialAccounts).toHaveLength(1);
  });

  it('chi tiết public chứa 5 trường mở rộng theo đúng shape (CRE-009)', async () => {
    const response = await request(app).get('/api/v1/creators/crt_0001');

    expect(response.status).toBe(200);
    expect(response.body.data.avatarUrl).toBeNull();
    expect(response.body.data.language).toBe('vi');
    expect(response.body.data.serviceMode).toBe('both');
    expect(response.body.data.audienceMetrics).toBeNull();
    expect(response.body.data.portfolioItems).toEqual([]);
  });

  it('chi tiết public không lộ status/availability/statusReason/userId (CRE-009)', async () => {
    const response = await request(app).get('/api/v1/creators/crt_0001');

    expect(response.status).toBe(200);
    expect(response.body.data).not.toHaveProperty('status');
    expect(response.body.data).not.toHaveProperty('availability');
    expect(response.body.data).not.toHaveProperty('statusReason');
    expect(response.body.data).not.toHaveProperty('userId');
  });

  it('trả 404 với creator chưa verified', async () => {
    const response = await request(app).get('/api/v1/creators/crt_0005');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('trả 404 với id không tồn tại', async () => {
    const response = await request(app).get('/api/v1/creators/crt_9999');

    expect(response.status).toBe(404);
  });

  it('trả 400 với id sai format', async () => {
    const response = await request(app).get('/api/v1/creators/abc!!');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
