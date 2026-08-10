import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { InMemoryAuditRepository } from '../src/modules/audit/audit.repository.memory.js';
import { DEMO_PASSWORD, buildUserSeed } from '../src/modules/users/user.seed.js';
import { buildTestApp } from './helpers/build-test-app.js';

/** T-P1 — Admin ẩn/khôi phục package vi phạm (PKG-010, ADM-010). */

let app: Express;
let audit: InMemoryAuditRepository;

beforeEach(async () => {
  audit = new InMemoryAuditRepository();
  app = buildTestApp({ users: await buildUserSeed(), audit });
});

const loginAs = async (email: string): Promise<string> => {
  const login = await request(app).post('/api/v1/auth/login').send({ email, password: DEMO_PASSWORD });
  expect(login.status).toBe(200);
  return login.body.data.accessToken as string;
};

describe('POST /api/v1/packages/:id/hide (PKG-010)', () => {
  it('thiếu reason → 400; có reason → hidden + audit + biến mất khỏi public', async () => {
    const adminToken = await loginAs('admin@demo.vn');

    const noReason = await request(app)
      .post('/api/v1/packages/pkg_0001/hide')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(noReason.status).toBe(400);

    const hidden = await request(app)
      .post('/api/v1/packages/pkg_0001/hide')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Nội dung sai lệch giá niêm yết.' });
    expect(hidden.status).toBe(200);
    expect(hidden.body.data.package.status).toBe('hidden');
    expect(hidden.body.data.package.statusReason).toContain('sai lệch');

    // Public không còn thấy (PKG-010: package ẩn không xuất hiện trên search).
    const publicList = await request(app).get('/api/v1/packages?creatorId=crt_0001');
    expect(
      publicList.body.data.some((item: { id: string }) => item.id === 'pkg_0001'),
    ).toBe(false);
    const detail = await request(app).get('/api/v1/packages/pkg_0001');
    expect(detail.status).toBe(404);

    // Audit append-only ghi actor + before/after + reason (CRE-008 mirror).
    const entries = await audit.listByTarget('package', 'pkg_0001');
    expect(entries).toHaveLength(1);
    expect(entries[0]?.action).toBe('package.hide');
    expect(entries[0]?.before).toBe('published');
    expect(entries[0]?.after).toBe('hidden');
    expect(entries[0]?.reason).toContain('sai lệch');
  });

  it('ẩn package duy nhất của creator → priceFromVnd về 0', async () => {
    const adminToken = await loginAs('admin@demo.vn');

    await request(app)
      .post('/api/v1/packages/pkg_0003/hide')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Vi phạm chính sách nội dung.' });

    const creator = await request(app).get('/api/v1/creators/crt_0002');
    expect(creator.body.data.priceFromVnd).toBe(0);
  });

  it('creator thường không gọi được hide → 403', async () => {
    const creatorToken = await loginAs('creator@demo.vn');
    const response = await request(app)
      .post('/api/v1/packages/pkg_0001/hide')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ reason: 'Thử ẩn package người khác.' });
    expect(response.status).toBe(403);
  });
});

describe('POST /api/v1/packages/:id/unhide (PKG-010)', () => {
  it('khôi phục về unpublished (không tự publish lại) + audit', async () => {
    const adminToken = await loginAs('admin@demo.vn');

    await request(app)
      .post('/api/v1/packages/pkg_0001/hide')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Nội dung sai lệch giá niêm yết.' });

    const unhidden = await request(app)
      .post('/api/v1/packages/pkg_0001/unhide')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(unhidden.status).toBe(200);
    expect(unhidden.body.data.package.status).toBe('unpublished');
    expect(unhidden.body.data.package.statusReason).toBeNull();

    const entries = await audit.listByTarget('package', 'pkg_0001');
    expect(entries).toHaveLength(2);
    expect(entries[1]?.action).toBe('package.unhide');

    // Package chưa ẩn mà unhide → 409.
    const again = await request(app)
      .post('/api/v1/packages/pkg_0001/unhide')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(again.status).toBe(409);
  });
});
