import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { CREATOR_SEED } from '../src/modules/creators/creator.seed.js';
import { DEMO_PASSWORD, buildUserSeed } from '../src/modules/users/user.seed.js';
import { buildTestServer } from './helpers/test-server.js';
import { futureDeadline } from './helpers/future-deadline.js';

/** T-P5 — Nộp bài, revision có kiểm soát, nghiệm thu (DLV-001..DLV-006). */

let app: Server;

beforeEach(async () => {
  app = buildTestServer({ users: await buildUserSeed(), creators: CREATOR_SEED });
});

const loginAs = async (email: string): Promise<string> => {
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: DEMO_PASSWORD });
  expect(login.status).toBe(200);
  return login.body.data.accessToken as string;
};

const move = (token: string, bookingId: string, action: string, reason?: string) =>
  request(app)
    .post(`/api/v1/bookings/${bookingId}/transition`)
    .set('Authorization', `Bearer ${token}`)
    .send(reason === undefined ? { action } : { action, reason });

/** Đưa booking tới trạng thái đang sản xuất — điểm bắt đầu của mọi test ở đây. */
const bookingInProgress = async (): Promise<{
  bookingId: string;
  brandToken: string;
  creatorToken: string;
  adminToken: string;
}> => {
  const brandToken = await loginAs('brand@demo.vn');
  const creatorToken = await loginAs('creator2@demo.vn');
  const adminToken = await loginAs('admin@demo.vn');

  const created = await request(app)
    .post('/api/v1/bookings')
    .set('Authorization', `Bearer ${brandToken}`)
    .send({
      creatorId: 'crt_0001',
      packageId: 'pkg_0001',
      selectedAddOnIds: [],
      brief: {
        objective: 'Giới thiệu món mới cho quán cà phê tại Hoàn Kiếm.',
        keyMessage: 'Cà phê muối vị mới.',
        mustHaveScenes: [],
        prohibited: [],
        references: [],
        desiredDeadline: futureDeadline(),
      },
    });
  const bookingId = created.body.data.booking.id as string;

  await move(brandToken, bookingId, 'send');
  await move(creatorToken, bookingId, 'accept');
  await move(adminToken, bookingId, 'confirm_payment');
  await move(creatorToken, bookingId, 'start_work');

  return { bookingId, brandToken, creatorToken, adminToken };
};

/** pkg_0001 có 1 deliverable, đăng trên kênh creator → cần bằng chứng đăng bài. */
const validSubmission = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  note: 'Bản dựng đầu tiên, nhờ anh chị xem giúp.',
  items: [
    {
      deliverableIndex: 0,
      fileUrl: 'https://cdn.example.vn/video-v1.mp4',
      linkUrl: null,
      description: 'Video review 45 giây quay dọc tại quán.',
    },
  ],
  postingProofs: [{ platform: 'tiktok', url: 'https://www.tiktok.com/@lanchifoodie/video/1' }],
  ...overrides,
});

const submit = (token: string, bookingId: string, body: Record<string, unknown>) =>
  request(app)
    .post(`/api/v1/bookings/${bookingId}/submissions`)
    .set('Authorization', `Bearer ${token}`)
    .send(body);

describe('Nộp bài (DLV-001, DLV-004, DLV-006)', () => {
  it('creator nộp bài → booking sang Đã nộp bài, submission là version 1', async () => {
    const { bookingId, creatorToken } = await bookingInProgress();

    const response = await submit(creatorToken, bookingId, validSubmission());
    expect(response.status).toBe(201);
    expect(response.body.data.submission.version).toBe(1);

    const booking = await request(app)
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${creatorToken}`);
    expect(booking.body.data.booking.status).toBe('delivered');
  });

  it('thiếu deliverable bắt buộc → 400 (DLV-001)', async () => {
    const { bookingId, creatorToken } = await bookingInProgress();

    const response = await submit(creatorToken, bookingId, validSubmission({ items: [] }));
    expect(response.status).toBe(400);
  });

  it('gói yêu cầu đăng kênh creator mà thiếu link bài đăng → 400 (DLV-006)', async () => {
    const { bookingId, creatorToken } = await bookingInProgress();

    const response = await submit(
      creatorToken,
      bookingId,
      validSubmission({ postingProofs: [] }),
    );
    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('link bài đăng');
  });

  it('deliverable không có cả file lẫn link → 400', async () => {
    const { bookingId, creatorToken } = await bookingInProgress();

    const response = await submit(
      creatorToken,
      bookingId,
      validSubmission({
        items: [
          {
            deliverableIndex: 0,
            fileUrl: null,
            linkUrl: null,
            description: 'Chưa đính kèm gì cả.',
          },
        ],
      }),
    );
    expect(response.status).toBe(400);
  });

  it('brand không nộp bài thay creator → 403', async () => {
    const { bookingId, brandToken } = await bookingInProgress();

    const response = await submit(brandToken, bookingId, validSubmission());
    expect(response.status).toBe(403);
  });
});

describe('Vòng sửa bài (DLV-003, DLV-004)', () => {
  it('brand yêu cầu sửa → creator nộp lại version 2, lịch sử giữ cả hai', async () => {
    const { bookingId, brandToken, creatorToken } = await bookingInProgress();
    await submit(creatorToken, bookingId, validSubmission());

    const revision = await request(app)
      .post(`/api/v1/bookings/${bookingId}/revisions`)
      .set('Authorization', `Bearer ${brandToken}`)
      .send({ reason: 'Cảnh mở đầu chưa thấy rõ biển hiệu quán, nhờ bạn quay lại.' });
    expect(revision.status).toBe(201);
    expect(revision.body.data.revision.submissionVersion).toBe(1);

    const afterRevision = await request(app)
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${brandToken}`);
    expect(afterRevision.body.data.booking.status).toBe('revision_requested');

    const resubmit = await submit(
      creatorToken,
      bookingId,
      validSubmission({ note: 'Đã quay lại cảnh mở đầu.' }),
    );
    expect(resubmit.status).toBe(201);
    expect(resubmit.body.data.submission.version).toBe(2);

    const state = await request(app)
      .get(`/api/v1/bookings/${bookingId}/submissions`)
      .set('Authorization', `Bearer ${brandToken}`);
    expect(state.body.data.submissions).toHaveLength(2);
    expect(state.body.data.revisionsUsed).toBe(1);
    expect(state.body.data.revisionsIncluded).toBe(1);
  });

  it('vượt hạn mức sửa đã mua → 409 kèm gợi ý mua thêm (DLV-003)', async () => {
    const { bookingId, brandToken, creatorToken } = await bookingInProgress();
    await submit(creatorToken, bookingId, validSubmission());

    // pkg_0001 chỉ bao gồm 1 lượt sửa.
    const first = await request(app)
      .post(`/api/v1/bookings/${bookingId}/revisions`)
      .set('Authorization', `Bearer ${brandToken}`)
      .send({ reason: 'Cảnh mở đầu chưa thấy rõ biển hiệu quán.' });
    expect(first.status).toBe(201);

    await submit(creatorToken, bookingId, validSubmission());

    const second = await request(app)
      .post(`/api/v1/bookings/${bookingId}/revisions`)
      .set('Authorization', `Bearer ${brandToken}`)
      .send({ reason: 'Muốn đổi thêm nhạc nền cho khớp thương hiệu.' });
    expect(second.status).toBe(409);
    expect(second.body.error.message).toContain('hết');
  });

  it('yêu cầu sửa phải nêu lý do đủ dài → 400', async () => {
    const { bookingId, brandToken, creatorToken } = await bookingInProgress();
    await submit(creatorToken, bookingId, validSubmission());

    const response = await request(app)
      .post(`/api/v1/bookings/${bookingId}/revisions`)
      .set('Authorization', `Bearer ${brandToken}`)
      .send({ reason: 'sửa đi' });
    expect(response.status).toBe(400);
  });

  it('creator không tự yêu cầu sửa thay brand → 403', async () => {
    const { bookingId, creatorToken } = await bookingInProgress();
    await submit(creatorToken, bookingId, validSubmission());

    const response = await request(app)
      .post(`/api/v1/bookings/${bookingId}/revisions`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ reason: 'Tôi tự yêu cầu sửa bài của chính mình.' });
    expect(response.status).toBe(403);
  });
});

describe('Nghiệm thu và hoàn tất (DLV-005, SRS §9.1)', () => {
  it('brand approve → Đã nghiệm thu; admin complete → Hoàn tất', async () => {
    const { bookingId, brandToken, creatorToken, adminToken } = await bookingInProgress();
    await submit(creatorToken, bookingId, validSubmission());

    const approved = await move(brandToken, bookingId, 'approve');
    expect(approved.status).toBe(200);
    expect(approved.body.data.booking.status).toBe('approved');

    const completed = await move(adminToken, bookingId, 'complete');
    expect(completed.status).toBe(200);
    expect(completed.body.data.booking.status).toBe('completed');

    // Timeline ghi đủ mốc nộp bài → nghiệm thu → hoàn tất (BKG-008).
    const actions = (completed.body.data.booking.timeline as readonly { action: string }[]).map(
      (event) => event.action,
    );
    expect(actions).toContain('submit');
    expect(actions).toContain('approve');
    expect(actions).toContain('complete');
  });

  it('creator không tự nghiệm thu → 403; chưa nộp bài mà approve → 409', async () => {
    const { bookingId, brandToken, creatorToken } = await bookingInProgress();

    const tooEarly = await move(brandToken, bookingId, 'approve');
    expect(tooEarly.status).toBe(409);

    await submit(creatorToken, bookingId, validSubmission());
    const selfApprove = await move(creatorToken, bookingId, 'approve');
    expect(selfApprove.status).toBe(403);
  });

  it('brand không tự bấm hoàn tất — chỉ Operations → 403', async () => {
    const { bookingId, brandToken, creatorToken } = await bookingInProgress();
    await submit(creatorToken, bookingId, validSubmission());
    await move(brandToken, bookingId, 'approve');

    const response = await move(brandToken, bookingId, 'complete');
    expect(response.status).toBe(403);
  });
});
