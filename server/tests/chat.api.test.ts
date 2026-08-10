import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { InMemoryAuditRepository } from '../src/modules/audit/audit.repository.memory.js';
import { InMemoryNotificationRepository } from '../src/modules/notifications/notification.repository.memory.js';
import { CREATOR_SEED } from '../src/modules/creators/creator.seed.js';
import { DEMO_PASSWORD, buildUserSeed } from '../src/modules/users/user.seed.js';
import { buildTestApp } from './helpers/build-test-app.js';

/** T-P4 — Chat trong booking (CHAT-001..006) và thông báo (NTF-001..004). */

let app: Express;
let audit: InMemoryAuditRepository;
let notifications: InMemoryNotificationRepository;

beforeEach(async () => {
  audit = new InMemoryAuditRepository();
  notifications = new InMemoryNotificationRepository();
  app = buildTestApp({
    users: await buildUserSeed(),
    creators: CREATOR_SEED,
    audit,
    notificationRepository: notifications,
  });
});

const loginAs = async (email: string): Promise<string> => {
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: DEMO_PASSWORD });
  expect(login.status).toBe(200);
  return login.body.data.accessToken as string;
};

/** Tạo booking thật giữa brand demo và creator2 (chủ crt_0001). */
const createBooking = async (brandToken: string): Promise<string> => {
  const response = await request(app)
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
        desiredDeadline: '2026-09-01T00:00:00.000Z',
      },
    });
  expect(response.status).toBe(201);
  return response.body.data.booking.id as string;
};

const send = (token: string, bookingId: string, body: string) =>
  request(app)
    .post(`/api/v1/bookings/${bookingId}/messages`)
    .set('Authorization', `Bearer ${token}`)
    .send({ body });

describe('Chat trong booking (CHAT-001..CHAT-003)', () => {
  it('hai bên gửi và đọc được thread; tin xếp theo thời gian', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const creatorToken = await loginAs('creator2@demo.vn');
    const bookingId = await createBooking(brandToken);

    expect((await send(brandToken, bookingId, 'Chào bạn, mình muốn quay tuần này.')).status).toBe(201);
    expect((await send(creatorToken, bookingId, 'Chào bạn, mình nhận nhé.')).status).toBe(201);

    const thread = await request(app)
      .get(`/api/v1/bookings/${bookingId}/messages`)
      .set('Authorization', `Bearer ${creatorToken}`);
    expect(thread.status).toBe(200);
    expect(thread.body.data).toHaveLength(2);
    expect(thread.body.data[0].body).toContain('muốn quay tuần này');
    expect(thread.body.data[0].senderRole).toBe('brand');
  });

  it('đánh dấu đã đọc cập nhật read receipt (CHAT-003)', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const creatorToken = await loginAs('creator2@demo.vn');
    const bookingId = await createBooking(brandToken);
    await send(brandToken, bookingId, 'Bạn xem giúp mình brief nhé.');

    const marked = await request(app)
      .post(`/api/v1/bookings/${bookingId}/messages/read`)
      .set('Authorization', `Bearer ${creatorToken}`);
    expect(marked.status).toBe(200);
    expect(marked.body.data.markedRead).toBe(1);

    // Đọc lại lần nữa không tăng thêm.
    const again = await request(app)
      .post(`/api/v1/bookings/${bookingId}/messages/read`)
      .set('Authorization', `Bearer ${creatorToken}`);
    expect(again.body.data.markedRead).toBe(0);
  });

  it('người ngoài booking không đọc/gửi được — trả 404 (CHAT-001, AC-09)', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const bookingId = await createBooking(brandToken);

    const registered = await request(app).post('/api/v1/auth/register').send({
      email: 'brandngoai2@test.vn',
      password: 'MatKhau123',
      displayName: 'Brand Ngoài',
      role: 'brand',
      termsAccepted: true,
    });
    const outsiderToken = registered.body.data.accessToken as string;

    const read = await request(app)
      .get(`/api/v1/bookings/${bookingId}/messages`)
      .set('Authorization', `Bearer ${outsiderToken}`);
    expect(read.status).toBe(404);

    const write = await send(outsiderToken, bookingId, 'Tôi chen vào thread này.');
    expect(write.status).toBe(404);

    const guest = await request(app).get(`/api/v1/bookings/${bookingId}/messages`);
    expect(guest.status).toBe(401);
  });

  it('admin đọc được thread nhưng bị ghi audit (CHAT-005)', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const adminToken = await loginAs('admin@demo.vn');
    const bookingId = await createBooking(brandToken);
    await send(brandToken, bookingId, 'Nội dung trao đổi giữa hai bên.');

    const read = await request(app)
      .get(`/api/v1/bookings/${bookingId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(read.status).toBe(200);

    const entries = await audit.listByTarget('booking', bookingId);
    expect(entries.some((entry) => entry.action === 'chat.admin_access')).toBe(true);
  });
});

describe('Cảnh báo trao đổi ngoài nền tảng (CHAT-004)', () => {
  it('gửi số điện thoại/email trước khi xác nhận bị đánh dấu nhưng KHÔNG bị chặn', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const bookingId = await createBooking(brandToken);

    const withPhone = await send(brandToken, bookingId, 'Gọi mình số 0912345678 nhé.');
    expect(withPhone.status).toBe(201);
    expect(withPhone.body.data.message.offPlatformFlagged).toBe(true);

    const withEmail = await send(brandToken, bookingId, 'Mail mình: aa@bb.vn để trao đổi.');
    expect(withEmail.body.data.message.offPlatformFlagged).toBe(true);

    // Nội dung hợp lệ không bị đánh dấu nhầm.
    const normal = await send(brandToken, bookingId, 'Deadline 1/9 bạn kịp không?');
    expect(normal.body.data.message.offPlatformFlagged).toBe(false);
  });

  it('sau khi booking xác nhận thì trao đổi liên hệ là hợp lệ, không đánh dấu', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const creatorToken = await loginAs('creator2@demo.vn');
    const adminToken = await loginAs('admin@demo.vn');
    const bookingId = await createBooking(brandToken);

    const move = (token: string, action: string) =>
      request(app)
        .post(`/api/v1/bookings/${bookingId}/transition`)
        .set('Authorization', `Bearer ${token}`)
        .send({ action });
    await move(brandToken, 'send');
    await move(creatorToken, 'accept');
    await move(adminToken, 'confirm_payment');

    const afterConfirm = await send(brandToken, bookingId, 'Địa chỉ quán: gọi mình 0912345678.');
    expect(afterConfirm.body.data.message.offPlatformFlagged).toBe(false);
  });
});

describe('Thu hồi tin nhắn (CHAT-006)', () => {
  it('người gửi thu hồi được, nội dung ẩn nhưng bản ghi vẫn còn', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const bookingId = await createBooking(brandToken);
    const sent = await send(brandToken, bookingId, 'Nội dung gửi nhầm.');
    const messageId = sent.body.data.message.id as string;

    const removed = await request(app)
      .delete(`/api/v1/bookings/${bookingId}/messages/${messageId}`)
      .set('Authorization', `Bearer ${brandToken}`);
    expect(removed.status).toBe(200);
    expect(removed.body.data.message.isDeleted).toBe(true);
    expect(removed.body.data.message.body).toBe('Tin nhắn đã được thu hồi');

    // Bản ghi vẫn nằm trong thread (BR-015).
    const thread = await request(app)
      .get(`/api/v1/bookings/${bookingId}/messages`)
      .set('Authorization', `Bearer ${brandToken}`);
    expect(thread.body.data).toHaveLength(1);
    expect(thread.body.data[0].isDeleted).toBe(true);
  });

  it('không thu hồi được tin của người khác → 403', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const creatorToken = await loginAs('creator2@demo.vn');
    const bookingId = await createBooking(brandToken);
    const sent = await send(brandToken, bookingId, 'Tin của brand.');

    const response = await request(app)
      .delete(`/api/v1/bookings/${bookingId}/messages/${sent.body.data.message.id}`)
      .set('Authorization', `Bearer ${creatorToken}`);
    expect(response.status).toBe(403);
  });
});

describe('Thông báo (NTF-001)', () => {
  it('tin nhắn mới tạo thông báo cho phía còn lại, không tạo cho người gửi', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const creatorToken = await loginAs('creator2@demo.vn');
    const bookingId = await createBooking(brandToken);
    await send(brandToken, bookingId, 'Bạn xem giúp mình brief nhé.');

    const creatorInbox = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${creatorToken}`);
    expect(creatorInbox.status).toBe(200);
    expect(creatorInbox.body.data.unreadCount).toBeGreaterThanOrEqual(1);
    const newMessageItems = creatorInbox.body.data.items.filter(
      (item: { type: string }) => item.type === 'new_message',
    );
    expect(newMessageItems).toHaveLength(1);
    // Deep link về đúng booking (NTF-001).
    expect(newMessageItems[0].link).toBe(`/bookings/${bookingId}`);

    const brandInbox = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${brandToken}`);
    expect(
      brandInbox.body.data.items.filter((item: { type: string }) => item.type === 'new_message'),
    ).toHaveLength(0);
  });

  it('chuyển trạng thái booking tạo thông báo cho phía còn lại', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const creatorToken = await loginAs('creator2@demo.vn');
    const bookingId = await createBooking(brandToken);

    await request(app)
      .post(`/api/v1/bookings/${bookingId}/transition`)
      .set('Authorization', `Bearer ${brandToken}`)
      .send({ action: 'send' });

    const inbox = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${creatorToken}`);
    expect(
      inbox.body.data.items.some((item: { type: string }) => item.type === 'booking_status'),
    ).toBe(true);
  });

  it('đánh dấu đã đọc một thông báo và đọc tất cả', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const creatorToken = await loginAs('creator2@demo.vn');
    const bookingId = await createBooking(brandToken);
    await send(brandToken, bookingId, 'Tin thứ nhất.');
    await send(brandToken, bookingId, 'Tin thứ hai.');

    const inbox = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${creatorToken}`);
    const firstId = inbox.body.data.items[0].id as string;

    const readOne = await request(app)
      .post(`/api/v1/notifications/${firstId}/read`)
      .set('Authorization', `Bearer ${creatorToken}`);
    expect(readOne.status).toBe(200);

    const readAll = await request(app)
      .post('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${creatorToken}`);
    expect(readAll.body.data.markedRead).toBeGreaterThanOrEqual(1);

    const after = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${creatorToken}`);
    expect(after.body.data.unreadCount).toBe(0);
  });

  it('không đọc được thông báo của người khác → 404', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const creatorToken = await loginAs('creator2@demo.vn');
    const bookingId = await createBooking(brandToken);
    await send(brandToken, bookingId, 'Tin cho creator.');

    const creatorInbox = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${creatorToken}`);
    const notificationId = creatorInbox.body.data.items[0].id as string;

    const response = await request(app)
      .post(`/api/v1/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${brandToken}`);
    expect(response.status).toBe(404);
  });
});
