import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { InMemoryAuditRepository } from '../src/modules/audit/audit.repository.memory.js';
import { DEMO_PASSWORD, buildUserSeed } from '../src/modules/users/user.seed.js';
import { buildTestApp } from './helpers/build-test-app.js';

/** T-ADM — Xem audit log (ADM-009). Chỉ đọc: không có endpoint sửa/xóa (BR-015). */

let app: Express;
let audit: InMemoryAuditRepository;

beforeEach(async () => {
  audit = new InMemoryAuditRepository();
  app = buildTestApp({ users: await buildUserSeed(), audit });
});

const loginAsAdmin = async (): Promise<string> => {
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@demo.vn', password: DEMO_PASSWORD });
  return login.body.data.accessToken as string;
};

describe('GET /api/v1/audit (ADM-009)', () => {
  it('liệt kê entry mới nhất trước, kèm email người thực hiện', async () => {
    const token = await loginAsAdmin();

    // Sinh 2 entry thật qua API admin thay vì ghi thẳng repository.
    await request(app)
      .post('/api/v1/users/usr_demo_creator/lock')
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Vi phạm chính sách nội dung.' });
    await request(app)
      .post('/api/v1/users/usr_demo_creator/unlock')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    const response = await request(app)
      .get('/api/v1/audit')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    // Mới nhất lên đầu.
    expect(response.body.data[0].action).toBe('user.unlock');
    expect(response.body.data[1].action).toBe('user.lock');
    // actorId thuần không đọc được → service gắn kèm email.
    expect(response.body.data[0].actorEmail).toBe('admin@demo.vn');
    expect(response.body.data[1].reason).toContain('Vi phạm');
    expect(response.body.meta.total).toBe(2);
  });

  it('lọc theo targetType và action', async () => {
    const token = await loginAsAdmin();
    await request(app)
      .post('/api/v1/users/usr_demo_brand/lock')
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Tài khoản giả mạo thương hiệu.' });
    await request(app)
      .post('/api/v1/packages/pkg_0001/hide')
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Sai lệch giá niêm yết.' });

    const byTarget = await request(app)
      .get('/api/v1/audit?targetType=package')
      .set('Authorization', `Bearer ${token}`);
    expect(byTarget.body.data).toHaveLength(1);
    expect(byTarget.body.data[0].targetId).toBe('pkg_0001');

    const byAction = await request(app)
      .get('/api/v1/audit?action=user.')
      .set('Authorization', `Bearer ${token}`);
    expect(byAction.body.data).toHaveLength(1);
    expect(byAction.body.data[0].action).toBe('user.lock');
  });

  it('non-admin không đọc được audit → 403; chưa đăng nhập → 401', async () => {
    const creatorLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'creator@demo.vn', password: DEMO_PASSWORD });
    const creatorToken = creatorLogin.body.data.accessToken as string;

    const asCreator = await request(app)
      .get('/api/v1/audit')
      .set('Authorization', `Bearer ${creatorToken}`);
    expect(asCreator.status).toBe(403);

    const asGuest = await request(app).get('/api/v1/audit');
    expect(asGuest.status).toBe(401);
  });
});
