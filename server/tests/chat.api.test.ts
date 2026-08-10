import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { InMemoryAuditRepository } from '../src/modules/audit/audit.repository.memory.js';
import { InMemoryNotificationRepository } from '../src/modules/notifications/notification.repository.memory.js';
import { CREATOR_SEED } from '../src/modules/creators/creator.seed.js';
import { DEMO_PASSWORD, buildUserSeed } from '../src/modules/users/user.seed.js';
import { buildTestApp } from './helpers/build-test-app.js';

/**
 * T-P4b — Chat độc lập với booking (OD-09, CHAT-001..006).
 * Một luồng cho mỗi cặp brand ↔ creator: hỏi đáp trước booking và trao đổi
 * trong booking dùng chung một thread.
 */

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

/** Brand mở luồng với crt_0001 — không cần booking nào tồn tại trước. */
const startConversation = async (token: string, creatorId = 'crt_0001'): Promise<string> => {
  const response = await request(app)
    .post('/api/v1/conversations')
    .set('Authorization', `Bearer ${token}`)
    .send({ creatorId });
  expect(response.status).toBe(201);
  return response.body.data.conversation.id as string;
};

const send = (token: string, conversationId: string, body: string, bookingId?: string) =>
  request(app)
    .post(`/api/v1/conversations/${conversationId}/messages`)
    .set('Authorization', `Bearer ${token}`)
    .send(bookingId === undefined ? { body } : { body, bookingId });

describe('Mở luồng chat trước khi booking (OD-09)', () => {
  it('brand nhắn được cho creator dù chưa có booking nào', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const creatorToken = await loginAs('creator2@demo.vn');
    const conversationId = await startConversation(brandToken);

    expect((await send(brandToken, conversationId, 'Bạn còn nhận lịch tuần này không?')).status).toBe(201);
    expect((await send(creatorToken, conversationId, 'Còn bạn nhé, bạn cần quay gì?')).status).toBe(201);

    const thread = await request(app)
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${brandToken}`);
    expect(thread.status).toBe(200);
    expect(thread.body.data).toHaveLength(2);
    expect(thread.body.data[0].bookingId).toBeNull();
  });

  it('mở lại luồng với cùng creator trả về đúng luồng cũ (idempotent)', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const first = await startConversation(brandToken);
    const second = await startConversation(brandToken);
    expect(second).toBe(first);
  });

  it('creator không tự mở luồng — chặn nhắn chào mời hàng loạt → 403', async () => {
    const creatorToken = await loginAs('creator2@demo.vn');
    const response = await request(app)
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ creatorId: 'crt_0002' });
    expect(response.status).toBe(403);
  });

  it('creator chưa duyệt thì không mở luồng được → 404', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const response = await request(app)
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${brandToken}`)
      .send({ creatorId: 'crt_0005' });
    expect(response.status).toBe(404);
  });
});

describe('Danh sách hội thoại', () => {
  it('mỗi bên thấy luồng của mình kèm số chưa đọc và tin gần nhất', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const creatorToken = await loginAs('creator2@demo.vn');
    const conversationId = await startConversation(brandToken);
    await send(brandToken, conversationId, 'Bạn báo giá giúp mình gói combo nhé.');

    const creatorList = await request(app)
      .get('/api/v1/conversations')
      .set('Authorization', `Bearer ${creatorToken}`);
    expect(creatorList.status).toBe(200);
    expect(creatorList.body.data).toHaveLength(1);
    expect(creatorList.body.data[0].unreadCount).toBe(1);
    expect(creatorList.body.data[0].lastMessagePreview).toContain('báo giá');
    expect(creatorList.body.data[0].brandDisplayName).toBe('Brand Demo');

    // Người gửi không tự tính là chưa đọc.
    const brandList = await request(app)
      .get('/api/v1/conversations')
      .set('Authorization', `Bearer ${brandToken}`);
    expect(brandList.body.data[0].unreadCount).toBe(0);
    expect(brandList.body.data[0].creatorDisplayName).toBeTruthy();
  });

  it('đánh dấu đã đọc đưa số chưa đọc về 0 (CHAT-003)', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const creatorToken = await loginAs('creator2@demo.vn');
    const conversationId = await startConversation(brandToken);
    await send(brandToken, conversationId, 'Bạn xem giúp mình brief nhé.');

    const marked = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages/read`)
      .set('Authorization', `Bearer ${creatorToken}`);
    expect(marked.body.data.markedRead).toBe(1);

    const list = await request(app)
      .get('/api/v1/conversations')
      .set('Authorization', `Bearer ${creatorToken}`);
    expect(list.body.data[0].unreadCount).toBe(0);
  });
});

describe('Quyền truy cập luồng (CHAT-001, CHAT-005, AC-09)', () => {
  it('người ngoài không đọc/gửi được — trả 404 để không lộ luồng tồn tại', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const conversationId = await startConversation(brandToken);

    const registered = await request(app).post('/api/v1/auth/register').send({
      email: 'brandngoai3@test.vn',
      password: 'MatKhau123',
      displayName: 'Brand Ngoài',
      role: 'brand',
      termsAccepted: true,
    });
    const outsiderToken = registered.body.data.accessToken as string;

    const read = await request(app)
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${outsiderToken}`);
    expect(read.status).toBe(404);

    const write = await send(outsiderToken, conversationId, 'Tôi chen vào luồng này.');
    expect(write.status).toBe(404);

    const guest = await request(app).get(`/api/v1/conversations/${conversationId}/messages`);
    expect(guest.status).toBe(401);
  });

  it('admin đọc được để hỗ trợ nhưng bị ghi audit (CHAT-005)', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const adminToken = await loginAs('admin@demo.vn');
    const conversationId = await startConversation(brandToken);
    await send(brandToken, conversationId, 'Nội dung trao đổi giữa hai bên.');

    const read = await request(app)
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(read.status).toBe(200);

    const entries = await audit.listByTarget('conversation', conversationId);
    expect(entries.some((entry) => entry.action === 'chat.admin_access')).toBe(true);
  });
});

describe('Cảnh báo trao đổi ngoài nền tảng (CHAT-004)', () => {
  it('chat trước booking: gửi SĐT/email luôn bị đánh dấu, nhưng KHÔNG bị chặn', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const conversationId = await startConversation(brandToken);

    const withPhone = await send(brandToken, conversationId, 'Gọi mình số 0912345678 nhé.');
    expect(withPhone.status).toBe(201);
    expect(withPhone.body.data.message.offPlatformFlagged).toBe(true);

    const withEmail = await send(brandToken, conversationId, 'Mail mình: aa@bb.vn để trao đổi.');
    expect(withEmail.body.data.message.offPlatformFlagged).toBe(true);

    const normal = await send(brandToken, conversationId, 'Deadline 1/9 bạn kịp không?');
    expect(normal.body.data.message.offPlatformFlagged).toBe(false);
  });

  it('sau khi booking xác nhận, tin gắn nhãn booking đó không còn bị cảnh báo', async () => {
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
          desiredDeadline: '2026-09-01T00:00:00.000Z',
        },
      });
    const bookingId = created.body.data.booking.id as string;

    const move = (token: string, action: string) =>
      request(app)
        .post(`/api/v1/bookings/${bookingId}/transition`)
        .set('Authorization', `Bearer ${token}`)
        .send({ action });
    await move(brandToken, 'send');
    await move(creatorToken, 'accept');
    await move(adminToken, 'confirm_payment');

    const conversationId = await startConversation(brandToken);
    const tagged = await send(
      brandToken,
      conversationId,
      'Địa chỉ quán: gọi mình 0912345678 khi tới nhé.',
      bookingId,
    );
    expect(tagged.body.data.message.offPlatformFlagged).toBe(false);
  });
});

describe('Luồng của booking là cùng một thread (liên tục lịch sử)', () => {
  it('mở booking ra thấy đúng luồng đã chat trước đó', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const conversationId = await startConversation(brandToken);
    await send(brandToken, conversationId, 'Hỏi trước khi đặt: bạn quay ban đêm được không?');

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
          desiredDeadline: '2026-09-01T00:00:00.000Z',
        },
      });
    const bookingId = created.body.data.booking.id as string;

    const resolved = await request(app)
      .get(`/api/v1/conversations/for-booking/${bookingId}`)
      .set('Authorization', `Bearer ${brandToken}`);
    expect(resolved.status).toBe(200);
    expect(resolved.body.data.conversation.id).toBe(conversationId);

    // Lịch sử hỏi trước booking vẫn còn nguyên trong luồng.
    const thread = await request(app)
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${brandToken}`);
    expect(thread.body.data[0].body).toContain('quay ban đêm');
  });
});

describe('Thu hồi tin nhắn (CHAT-006)', () => {
  it('người gửi thu hồi được, nội dung ẩn nhưng bản ghi vẫn còn', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const conversationId = await startConversation(brandToken);
    const sent = await send(brandToken, conversationId, 'Nội dung gửi nhầm.');
    const messageId = sent.body.data.message.id as string;

    const removed = await request(app)
      .delete(`/api/v1/conversations/${conversationId}/messages/${messageId}`)
      .set('Authorization', `Bearer ${brandToken}`);
    expect(removed.status).toBe(200);
    expect(removed.body.data.message.isDeleted).toBe(true);
    expect(removed.body.data.message.body).toBe('Tin nhắn đã được thu hồi');

    const thread = await request(app)
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${brandToken}`);
    expect(thread.body.data).toHaveLength(1);
    expect(thread.body.data[0].isDeleted).toBe(true);
  });

  it('không thu hồi được tin của người khác → 403', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const creatorToken = await loginAs('creator2@demo.vn');
    const conversationId = await startConversation(brandToken);
    const sent = await send(brandToken, conversationId, 'Tin của brand.');

    const response = await request(app)
      .delete(`/api/v1/conversations/${conversationId}/messages/${sent.body.data.message.id}`)
      .set('Authorization', `Bearer ${creatorToken}`);
    expect(response.status).toBe(403);
  });
});

describe('Thông báo tin nhắn mới (NTF-001)', () => {
  it('chỉ phía còn lại nhận thông báo, deep link về đúng luồng', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const creatorToken = await loginAs('creator2@demo.vn');
    const conversationId = await startConversation(brandToken);
    await send(brandToken, conversationId, 'Bạn xem giúp mình brief nhé.');

    const creatorInbox = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${creatorToken}`);
    const items = creatorInbox.body.data.items.filter(
      (item: { type: string }) => item.type === 'new_message',
    );
    expect(items).toHaveLength(1);
    expect(items[0].link).toBe(`/messages?c=${conversationId}`);

    const brandInbox = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${brandToken}`);
    expect(
      brandInbox.body.data.items.filter((item: { type: string }) => item.type === 'new_message'),
    ).toHaveLength(0);
  });
});
