import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { InMemoryAuditRepository } from '../src/modules/audit/audit.repository.memory.js';
import { InMemoryBookingRepository } from '../src/modules/bookings/booking.repository.memory.js';
import { BookingService } from '../src/modules/bookings/booking.service.js';
import { InMemoryCreatorRepository } from '../src/modules/creators/creator.repository.memory.js';
import { CREATOR_SEED } from '../src/modules/creators/creator.seed.js';
import { InMemoryPackageRepository } from '../src/modules/packages/package.repository.memory.js';
import { PACKAGE_SEED } from '../src/modules/packages/package.seed.js';
import { DEMO_PASSWORD, buildUserSeed } from '../src/modules/users/user.seed.js';
import { buildTestServer } from './helpers/test-server.js';
import { futureDeadline } from './helpers/future-deadline.js';

/**
 * T-P3 — Vòng đời booking (BKG-001..BKG-011, BR-003..BR-005).
 * crt_0001 (verified, có 2 package published) là creator được đặt;
 * usr_demo_creator được gán làm chủ hồ sơ đó để đăng nhập thao tác.
 */

// Gắn creator seed vào tài khoản creator demo để test luồng hai phía.
const creatorsWithOwner = CREATOR_SEED.map((creator) =>
  creator.id === 'crt_0001' ? { ...creator, userId: 'usr_demo_creator' } : creator,
);

let app: Server;
let audit: InMemoryAuditRepository;
let bookings: InMemoryBookingRepository;

beforeEach(async () => {
  audit = new InMemoryAuditRepository();
  bookings = new InMemoryBookingRepository();
  app = buildTestServer({
    users: await buildUserSeed(),
    creators: creatorsWithOwner,
    audit,
    bookingRepository: bookings,
  });
});

const loginAs = async (email: string): Promise<string> => {
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: DEMO_PASSWORD });
  expect(login.status).toBe(200);
  return login.body.data.accessToken as string;
};

const validBrief = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  objective: 'Giới thiệu món mới cho quán cà phê tại Hoàn Kiếm.',
  keyMessage: 'Cà phê muối vị mới, giá sinh viên.',
  mustHaveScenes: ['Cảnh quay không gian quán', 'Cận cảnh ly cà phê'],
  prohibited: ['Không nhắc tên đối thủ'],
  references: ['https://www.tiktok.com/@lanchifoodie/video/123'],
  desiredDeadline: futureDeadline(),
  ...overrides,
});

/** Tạo booking nháp, trả về body booking. */
const createBooking = async (
  token: string,
  overrides: Record<string, unknown> = {},
): Promise<Record<string, never> & { id: string; code: string; totals: Record<string, number> }> => {
  const response = await request(app)
    .post('/api/v1/bookings')
    .set('Authorization', `Bearer ${token}`)
    .send({
      creatorId: 'crt_0001',
      packageId: 'pkg_0001',
      selectedAddOnIds: [],
      brief: validBrief(),
      ...overrides,
    });
  expect(response.status).toBe(201);
  return response.body.data.booking;
};

const transition = (token: string, bookingId: string, action: string, reason?: string) =>
  request(app)
    .post(`/api/v1/bookings/${bookingId}/transition`)
    .set('Authorization', `Bearer ${token}`)
    .send(reason === undefined ? { action } : { action, reason });

describe('Tạo booking (BKG-001, BKG-002, BKG-011)', () => {
  it('brand tạo nháp: server tự tính tiền, sinh mã KB-YYMMDD-XXXX, brief version 1', async () => {
    const token = await loginAs('brand@demo.vn');
    const booking = await createBooking(token);

    expect(booking.code).toMatch(/^KB-\d{6}-[A-Z2-9]{4}$/);
    expect((booking as unknown as { status: string }).status).toBe('draft');
    expect((booking as unknown as { brief: { version: number } }).brief.version).toBe(1);

    // pkg_0001 giá 1.500.000; phí 12% = 180.000 (lớn hơn mức tối thiểu 50.000).
    expect(booking.totals.packagePriceVnd).toBe(1_500_000);
    expect(booking.totals.addOnsTotalVnd).toBe(0);
    expect(booking.totals.platformFeeVnd).toBe(180_000);
    expect(booking.totals.totalVnd).toBe(1_680_000);
    expect(booking.totals.creatorEarningsVnd).toBe(1_500_000);
  });

  it('add-on cộng vào tổng tiền và vào cả phí nền tảng', async () => {
    const token = await loginAs('brand@demo.vn');
    // ado_0001 (giao nhanh) 300.000 + ado_0002 (file gốc) 500.000.
    const booking = await createBooking(token, { selectedAddOnIds: ['ado_0001', 'ado_0002'] });

    expect(booking.totals.addOnsTotalVnd).toBe(800_000);
    expect(booking.totals.platformFeeVnd).toBe(Math.round(2_300_000 * 0.12));
    expect(booking.totals.totalVnd).toBe(2_300_000 + Math.round(2_300_000 * 0.12));
  });

  it('client KHÔNG thể tự đặt giá — mọi số tiền gửi lên đều bị bỏ qua (PAY-001)', async () => {
    const token = await loginAs('brand@demo.vn');
    const response = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        creatorId: 'crt_0001',
        packageId: 'pkg_0001',
        selectedAddOnIds: [],
        brief: validBrief(),
        totals: { totalVnd: 1 },
        status: 'confirmed',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.booking.totals.totalVnd).toBe(1_680_000);
    expect(response.body.data.booking.status).toBe('draft');
  });

  it('add-on không thuộc package → 400; package không bán → 404', async () => {
    const token = await loginAs('brand@demo.vn');

    const wrongAddOn = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        creatorId: 'crt_0001',
        packageId: 'pkg_0001',
        selectedAddOnIds: ['ado_0004'],
        brief: validBrief(),
      });
    expect(wrongAddOn.status).toBe(400);

    const wrongPackage = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        creatorId: 'crt_0001',
        packageId: 'pkg_khongton',
        selectedAddOnIds: [],
        brief: validBrief(),
      });
    // Package không tồn tại → 404 (regex id vẫn hợp lệ nên qua được validate).
    expect(wrongPackage.status).toBe(404);
  });

  it('brief thiếu mục tiêu → 400 VALIDATION_ERROR', async () => {
    const token = await loginAs('brand@demo.vn');
    const response = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        creatorId: 'crt_0001',
        packageId: 'pkg_0001',
        selectedAddOnIds: [],
        brief: validBrief({ objective: 'ngắn' }),
      });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creator không tạo được booking → 403', async () => {
    const token = await loginAs('creator@demo.vn');
    const response = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        creatorId: 'crt_0001',
        packageId: 'pkg_0001',
        selectedAddOnIds: [],
        brief: validBrief(),
      });
    expect(response.status).toBe(403);
  });
});

describe('Máy trạng thái (SRS §9.2, BKG-004..BKG-008)', () => {
  it('luồng đầy đủ: nháp → chờ creator → chờ thanh toán → xác nhận → đang sản xuất', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const creatorToken = await loginAs('creator@demo.vn');
    const adminToken = await loginAs('admin@demo.vn');
    const booking = await createBooking(brandToken);

    const sent = await transition(brandToken, booking.id, 'send');
    expect(sent.status).toBe(200);
    expect(sent.body.data.booking.status).toBe('pending_creator');
    // Có hạn phản hồi để creator không giữ lịch vô thời hạn (BR-005).
    expect(sent.body.data.booking.expiresAt).not.toBeNull();

    const accepted = await transition(creatorToken, booking.id, 'accept');
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.booking.status).toBe('awaiting_payment');

    const confirmed = await transition(adminToken, booking.id, 'confirm_payment');
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.booking.status).toBe('confirmed');
    expect(confirmed.body.data.booking.expiresAt).toBeNull();

    const started = await transition(creatorToken, booking.id, 'start_work');
    expect(started.body.data.booking.status).toBe('in_progress');

    // Timeline ghi đủ 5 mốc: create + 4 transition (BKG-008).
    const timeline = started.body.data.booking.timeline as readonly { action: string }[];
    expect(timeline.map((event) => event.action)).toEqual([
      'create',
      'send',
      'accept',
      'confirm_payment',
      'start_work',
    ]);

    // Thao tác của admin trên booking được audit (ADM-005, BR-014).
    const entries = await audit.listByTarget('booking', booking.id);
    expect(entries.some((entry) => entry.action === 'booking.confirm_payment')).toBe(true);
  });

  it('transition sai trạng thái → 409; sai vai trò → 403', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const creatorToken = await loginAs('creator@demo.vn');
    const booking = await createBooking(brandToken);

    // Chưa gửi mà creator đã accept → sai trạng thái.
    const tooEarly = await transition(creatorToken, booking.id, 'accept');
    expect(tooEarly.status).toBe(409);

    await transition(brandToken, booking.id, 'send');

    // Brand tự accept thay creator → sai vai trò.
    const wrongActor = await transition(brandToken, booking.id, 'accept');
    expect(wrongActor.status).toBe(403);

    // Brand tự xác nhận thanh toán (chỉ Operations được) → sai vai trò.
    const selfConfirm = await transition(brandToken, booking.id, 'accept');
    expect(selfConfirm.status).toBe(403);
  });

  it('từ chối bắt buộc lý do và đưa booking sang đã hủy', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const creatorToken = await loginAs('creator@demo.vn');
    const booking = await createBooking(brandToken);
    await transition(brandToken, booking.id, 'send');

    const noReason = await transition(creatorToken, booking.id, 'reject');
    expect(noReason.status).toBe(400);

    const rejected = await transition(
      creatorToken,
      booking.id,
      'reject',
      'Lịch tuần này đã kín, không nhận thêm.',
    );
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.booking.status).toBe('cancelled');
    expect(rejected.body.data.booking.statusReason).toContain('Lịch tuần này');
  });

  it('đề nghị thay đổi đưa booking về nháp để brand sửa brief rồi gửi lại', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const creatorToken = await loginAs('creator@demo.vn');
    const booking = await createBooking(brandToken);
    await transition(brandToken, booking.id, 'send');

    const proposed = await transition(
      creatorToken,
      booking.id,
      'propose_change',
      'Cần dời deadline thêm 3 ngày vì lịch quay.',
    );
    expect(proposed.body.data.booking.status).toBe('draft');

    // Brand sửa brief → version tăng.
    const updated = await request(app)
      .put(`/api/v1/bookings/${booking.id}/brief`)
      .set('Authorization', `Bearer ${brandToken}`)
      .send({ brief: validBrief({ desiredDeadline: futureDeadline(45) }) });
    expect(updated.status).toBe(200);
    expect(updated.body.data.booking.brief.version).toBe(2);

    const resent = await transition(brandToken, booking.id, 'send');
    expect(resent.body.data.booking.status).toBe('pending_creator');
  });

  it('brand hủy trước thanh toán, có lý do (DSP-002)', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const booking = await createBooking(brandToken);
    await transition(brandToken, booking.id, 'send');

    const cancelled = await transition(
      brandToken,
      booking.id,
      'cancel',
      'Chiến dịch bị hoãn sang quý sau.',
    );
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.booking.status).toBe('cancelled');
  });

  it('client KHÔNG gọi được action expire — chỉ scheduler (system)', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const booking = await createBooking(brandToken);
    await transition(brandToken, booking.id, 'send');

    const response = await transition(brandToken, booking.id, 'expire');
    expect(response.status).toBe(400);
  });
});

describe('Snapshot bất biến (BKG-006, BR-003, PKG-008)', () => {
  it('creator accept khóa điều khoản; sửa package sau đó không đổi booking đã chốt', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const creatorToken = await loginAs('creator@demo.vn');
    const booking = await createBooking(brandToken);
    await transition(brandToken, booking.id, 'send');

    const accepted = await transition(creatorToken, booking.id, 'accept');
    const snapshot = accepted.body.data.booking.snapshot;
    expect(snapshot).not.toBeNull();
    expect(snapshot.packageName).toContain('Video review');
    expect(snapshot.packageVersion).toBe(1);
    expect(snapshot.totals.totalVnd).toBe(1_680_000);
    expect(snapshot.revisionsIncluded).toBe(1);
    expect(snapshot.brief.objective).toContain('Giới thiệu món mới');
    expect(snapshot.lockedAt).toBeTruthy();

    // Creator tăng giá package sau khi đã chốt.
    const edit = await request(app)
      .put('/api/v1/packages/pkg_0001')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        name: 'Video review quán — Gói Cơ bản',
        category: 'f&b',
        platforms: ['tiktok'],
        description: 'Một video review 30-60s quay dọc tại quán, đăng kênh creator của tôi.',
        deliverables: [
          {
            type: 'video',
            quantity: 1,
            description: 'Video 30-60s dọc 9:16',
            postedOnCreatorChannel: true,
          },
        ],
        priceVnd: 9_000_000,
        turnaroundDays: 5,
        revisionsIncluded: 1,
        usageRights: { repost: true, paidAds: false, durationMonths: 3, channels: ['facebook'] },
        addOns: [],
      });
    expect(edit.status).toBe(200);

    // Booking vẫn giữ nguyên điều khoản đã khóa.
    const after = await request(app)
      .get(`/api/v1/bookings/${booking.id}`)
      .set('Authorization', `Bearer ${brandToken}`);
    expect(after.body.data.booking.snapshot.totals.totalVnd).toBe(1_680_000);
    expect(after.body.data.booking.totals.totalVnd).toBe(1_680_000);
  });
});

describe('Quyền truy cập booking (AC-09, SEC-003)', () => {
  it('người ngoài không đọc được booking — trả 404 để không lộ sự tồn tại', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const booking = await createBooking(brandToken);

    // Brand khác đăng ký mới.
    const registered = await request(app).post('/api/v1/auth/register').send({
      email: 'brandngoai@test.vn',
      password: 'MatKhau123',
      displayName: 'Brand Ngoài',
      role: 'brand',
      termsAccepted: true,
    });
    const otherToken = registered.body.data.accessToken as string;

    const response = await request(app)
      .get(`/api/v1/bookings/${booking.id}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(response.status).toBe(404);

    const guest = await request(app).get(`/api/v1/bookings/${booking.id}`);
    expect(guest.status).toBe(401);
  });

  it('danh sách tách theo vai: brand thấy booking của mình, creator thấy của mình', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const creatorToken = await loginAs('creator@demo.vn');
    const adminToken = await loginAs('admin@demo.vn');
    await createBooking(brandToken);

    const brandList = await request(app)
      .get('/api/v1/bookings')
      .set('Authorization', `Bearer ${brandToken}`);
    expect(brandList.body.data).toHaveLength(1);

    const creatorList = await request(app)
      .get('/api/v1/bookings')
      .set('Authorization', `Bearer ${creatorToken}`);
    expect(creatorList.body.data).toHaveLength(1);

    const adminList = await request(app)
      .get('/api/v1/bookings')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminList.body.data).toHaveLength(1);
  });
});

describe('Hết hạn tự động (BKG-005, BR-005)', () => {
  it('scheduler chuyển booking quá hạn sang EXPIRED', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const booking = await createBooking(brandToken);
    await transition(brandToken, booking.id, 'send');

    const service = new BookingService(
      bookings,
      new InMemoryPackageRepository(PACKAGE_SEED),
      new InMemoryCreatorRepository(creatorsWithOwner),
      audit,
    );

    // Chưa tới hạn → không đụng gì.
    expect(await service.expireOverdue(new Date())).toBe(0);

    // Sau 4 ngày (hạn phản hồi 72 giờ) → hết hạn.
    const later = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
    expect(await service.expireOverdue(later)).toBe(1);

    const after = await request(app)
      .get(`/api/v1/bookings/${booking.id}`)
      .set('Authorization', `Bearer ${brandToken}`);
    expect(after.body.data.booking.status).toBe('expired');
  });
});

/**
 * A3 + A4 của báo cáo kiểm thử 20/08/2026: client chặn deadline bằng `min`
 * của input date, nhưng đó chỉ là gợi ý trình duyệt — API phải tự chặn.
 */
describe('Deadline: server kiểm, add-on giao nhanh rút ngắn thật', () => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const inDays = (days: number): string =>
    `${new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10)}T00:00:00.000Z`;

  const post = (token: string, body: Record<string, unknown>) =>
    request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${token}`).send({
      creatorId: 'crt_0001',
      packageId: 'pkg_0001',
      selectedAddOnIds: [],
      ...body,
    });

  it('deadline quá khứ → 400, không tạo được booking', async () => {
    const token = await loginAs('brand@demo.vn');
    const response = await post(token, {
      brief: validBrief({ desiredDeadline: '2020-01-01T00:00:00.000Z' }),
    });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('quá sớm');
    expect(response.body.error.details[0].field).toBe('brief.desiredDeadline');
  });

  it('deadline sớm hơn thời gian sản xuất (pkg_0001 = 5 ngày) → 400', async () => {
    const token = await loginAs('brand@demo.vn');
    const response = await post(token, { brief: validBrief({ desiredDeadline: inDays(4) }) });
    expect(response.status).toBe(400);
  });

  it('đúng ngày sớm nhất → 201 (không lệch một ngày vì so theo giờ)', async () => {
    const token = await loginAs('brand@demo.vn');
    const response = await post(token, { brief: validBrief({ desiredDeadline: inDays(5) }) });
    expect(response.status).toBe(201);
  });

  it('add-on giao nhanh → được chọn deadline 2 ngày thay vì 5', async () => {
    const token = await loginAs('brand@demo.vn');

    const withoutAddOn = await post(token, { brief: validBrief({ desiredDeadline: inDays(2) }) });
    expect(withoutAddOn.status).toBe(400);

    const withAddOn = await post(token, {
      selectedAddOnIds: ['ado_0001'], // Giao nhanh 48h
      brief: validBrief({ desiredDeadline: inDays(2) }),
    });
    expect(withAddOn.status).toBe(201);
  });

  it('sửa brief cũng không lách được deadline quá khứ', async () => {
    const token = await loginAs('brand@demo.vn');
    const booking = await createBooking(token);

    const response = await request(app)
      .put(`/api/v1/bookings/${booking.id}/brief`)
      .set('Authorization', `Bearer ${token}`)
      .send({ brief: validBrief({ desiredDeadline: '2020-01-01T00:00:00.000Z' }) });

    expect(response.status).toBe(400);
  });

  it('điều khoản chốt ghi thời gian đã mua, không phải thời gian niêm yết', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    // File này gán crt_0001 cho usr_demo_creator (xem creatorsWithOwner ở đầu file).
    const creatorToken = await loginAs('creator@demo.vn');
    const created = await post(brandToken, {
      selectedAddOnIds: ['ado_0001'],
      brief: validBrief({ desiredDeadline: inDays(2) }),
    });
    const bookingId = created.body.data.booking.id as string;

    await transition(brandToken, bookingId, 'send');
    const accepted = await transition(creatorToken, bookingId, 'accept');

    expect(accepted.status).toBe(200);
    expect(accepted.body.data.booking.snapshot.turnaroundDays).toBe(2);
  });
});

describe('Audit vòng đời booking (A6 — bằng chứng khi phân xử)', () => {
  it('mọi chuyển trạng thái đều để lại dấu vết, kể cả của brand/creator', async () => {
    const brandToken = await loginAs('brand@demo.vn');
    const creatorToken = await loginAs('creator@demo.vn');
    const booking = await createBooking(brandToken);

    await transition(brandToken, booking.id, 'send');
    await transition(creatorToken, booking.id, 'accept');

    const entries = await audit.listByTarget('booking', booking.id);
    expect(entries.map((entry) => entry.action)).toEqual(['booking.send', 'booking.accept']);
    expect(entries[0]?.actorId).toBe('usr_demo_brand');
    expect(entries[1]?.before).toBe('pending_creator');
    expect(entries[1]?.after).toBe('awaiting_payment');
  });
});
