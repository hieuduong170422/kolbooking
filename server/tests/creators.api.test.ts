import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildTestApp } from './helpers/build-test-app.js';

const app = buildTestApp();

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
});

describe('GET /api/v1/creators/:id', () => {
  it('trả về chi tiết creator verified', async () => {
    const response = await request(app).get('/api/v1/creators/crt_0001');

    expect(response.status).toBe(200);
    expect(response.body.data.displayName).toBe('Lan Chi Foodie');
    expect(response.body.data.socialAccounts).toHaveLength(1);
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
