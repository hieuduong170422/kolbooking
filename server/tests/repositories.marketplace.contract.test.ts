import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  REPOSITORY_DRIVERS,
  closeTestPool,
  type RepositorySet,
} from './helpers/repository-drivers.js';
import {
  makeBooking,
  makeBrand,
  makeCreator,
  makePackage,
} from './helpers/repository-fixtures.js';

/**
 * Test hợp đồng tầng lưu trữ — nhóm sàn: hồ sơ creator, gói dịch vụ, hồ sơ
 * brand, booking, hội thoại, tin nhắn, nộp bài, thông báo. Nhóm danh tính và
 * vận hành nằm ở repositories.identity.contract.test.ts.
 *
 * Cùng một bộ assertion chạy cho bản in-memory và bản PostgreSQL. Bản
 * PostgreSQL chỉ tham gia khi có TEST_DATABASE_URL.
 *
 * Mọi bản ghi so sánh theo thứ tự thời gian đều được tạo cách nhau qua `tick()`:
 * hai bản ghi trùng mili giây sẽ hòa, và hai tầng lưu trữ phá hòa theo hai cách
 * khác nhau — điều đó không phải hợp đồng nên test không được phụ thuộc vào.
 */
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 2));

afterAll(closeTestPool);

for (const driver of REPOSITORY_DRIVERS) {
  describe(`repository contract (${driver.name})`, () => {
    let repos: RepositorySet;

    beforeEach(async () => {
      repos = await driver.create();
    });

    describe('CreatorRepository', () => {
      it('sinh id mới khi tạo và giữ nguyên toàn bộ hồ sơ lồng nhau', async () => {
        const created = await repos.creators.create(makeCreator({ id: 'bi-bo-qua' }));

        // Đúng dạng route chấp nhận (/^crt_[a-zA-Z0-9]+$/): id chứa dấu gạch sẽ
        // bị chặn ở duyệt hồ sơ, mở chat và tạo booking.
        expect(created.id).toMatch(/^crt_[a-zA-Z0-9]+$/);
        expect(created.id).not.toBe('bi-bo-qua');

        const found = await repos.creators.findById(created.id);
        expect(found).toEqual(created);
        expect(found?.socialAccounts[0]?.handle).toBe('@lanchi');
        expect(found?.audienceMetrics?.viewCount).toBe(2_000_000);
        expect(found?.availability.availableDays).toEqual(['mon', 'tue']);
      });

      it('chỉ liệt kê hồ sơ đã duyệt và lọc theo từng tiêu chí', async () => {
        const verified = await repos.creators.create(makeCreator());
        await repos.creators.create(makeCreator({ status: 'pending_review' }));
        await repos.creators.create(
          makeCreator({
            displayName: 'Minh Travel',
            bio: 'Vlog du lịch miền Bắc',
            city: 'Hà Nội',
            niches: ['travel'],
            creatorType: 'influencer',
            serviceMode: 'online',
            priceFromVnd: 8_000_000,
            rating: 3.2,
            socialAccounts: [
              {
                platform: 'youtube',
                handle: '@minh',
                url: 'https://youtube.com/@minh',
                followerCount: 50_000,
                isVerified: true,
              },
            ],
          }),
        );

        const base = { sort: 'rating' as const, page: 1, limit: 10 };
        expect((await repos.creators.findAll(base)).total).toBe(2);

        // Tìm theo tên, mô tả và lĩnh vực.
        expect((await repos.creators.findAll({ ...base, search: 'foodie' })).total).toBe(1);
        expect((await repos.creators.findAll({ ...base, search: 'SÀI GÒN' })).total).toBe(1);
        expect((await repos.creators.findAll({ ...base, search: 'travel' })).total).toBe(1);

        expect((await repos.creators.findAll({ ...base, city: 'hồ chí minh' })).total).toBe(1);
        expect((await repos.creators.findAll({ ...base, creatorType: 'koc' })).total).toBe(1);
        expect((await repos.creators.findAll({ ...base, platform: 'youtube' })).total).toBe(1);
        expect((await repos.creators.findAll({ ...base, minRating: 4 })).total).toBe(1);
        expect((await repos.creators.findAll({ ...base, maxPriceVnd: 3_000_000 })).total).toBe(1);
        expect((await repos.creators.findAll({ ...base, minPriceVnd: 3_000_000 })).total).toBe(1);

        // serviceMode 'both' khớp mọi bộ lọc hình thức (CRE-006).
        const online = await repos.creators.findAll({ ...base, serviceMode: 'online' });
        expect(online.total).toBe(2);
        const offline = await repos.creators.findAll({ ...base, serviceMode: 'offline' });
        expect(offline.items.map((item) => item.id)).toEqual([verified.id]);
      });

      it('sắp xếp theo từng tiêu chí', async () => {
        const cheap = await repos.creators.create(
          makeCreator({ priceFromVnd: 1_000_000, rating: 3, completedBookings: 50 }),
        );
        const pricey = await repos.creators.create(
          makeCreator({ priceFromVnd: 9_000_000, rating: 5, completedBookings: 2 }),
        );

        const ids = async (sort: 'rating' | 'price_asc' | 'price_desc' | 'completed') =>
          (await repos.creators.findAll({ sort, page: 1, limit: 10 })).items.map((it) => it.id);

        expect(await ids('rating')).toEqual([pricey.id, cheap.id]);
        expect(await ids('price_asc')).toEqual([cheap.id, pricey.id]);
        expect(await ids('price_desc')).toEqual([pricey.id, cheap.id]);
        expect(await ids('completed')).toEqual([cheap.id, pricey.id]);
      });

      it('tìm theo user, cập nhật giữ id, và trả null khi hồ sơ không tồn tại', async () => {
        const created = await repos.creators.create(makeCreator({ userId: 'usr_creator' }));

        expect((await repos.creators.findByUserId('usr_creator'))?.id).toBe(created.id);
        expect(await repos.creators.findByUserId('usr_khac')).toBeNull();

        const updated = await repos.creators.update(created.id, {
          ...created,
          id: 'id-gia-mao',
          displayName: 'Tên mới',
          status: 'suspended',
          statusReason: 'Vi phạm',
        });
        expect(updated?.id).toBe(created.id);
        expect(updated?.displayName).toBe('Tên mới');
        expect(updated?.statusReason).toBe('Vi phạm');
        expect(await repos.creators.update('crt_khong_co', makeCreator())).toBeNull();
      });

      it('admin queue thấy mọi trạng thái, kể cả hồ sơ chưa duyệt', async () => {
        await repos.creators.create(makeCreator({ status: 'pending_review' }));
        const rejected = await repos.creators.create(makeCreator({ status: 'rejected' }));
        await repos.creators.create(makeCreator());

        const queue = await repos.creators.findByStatusForReview(['pending_review', 'rejected']);
        expect(queue).toHaveLength(2);
        expect((await repos.creators.findForReviewById(rejected.id))?.status).toBe('rejected');
      });

      it('thêm và xóa mục portfolio, xóa mục không tồn tại là no-op', async () => {
        const created = await repos.creators.create(makeCreator());
        const item = {
          id: 'ptf_1',
          type: 'image' as const,
          url: 'https://cdn.vn/1.jpg',
          caption: 'Ảnh món',
          category: null,
          thumbnailUrl: null,
          createdAt: '2026-08-01T00:00:00.000Z',
        };

        const added = await repos.creators.addPortfolioItem(created.id, item);
        expect(added?.portfolioItems).toEqual([item]);

        const addedTwo = await repos.creators.addPortfolioItem(created.id, { ...item, id: 'ptf_2' });
        expect(addedTwo?.portfolioItems.map((it) => it.id)).toEqual(['ptf_1', 'ptf_2']);

        const removed = await repos.creators.removePortfolioItem(created.id, 'ptf_1');
        expect(removed?.portfolioItems.map((it) => it.id)).toEqual(['ptf_2']);

        const noop = await repos.creators.removePortfolioItem(created.id, 'khong-co');
        expect(noop?.portfolioItems.map((it) => it.id)).toEqual(['ptf_2']);

        expect(await repos.creators.addPortfolioItem('crt_khong_co', item)).toBeNull();
        expect(await repos.creators.removePortfolioItem('crt_khong_co', 'ptf_1')).toBeNull();
      });
    });


    describe('PackageRepository', () => {
      it('chỉ trả package đã đăng của creator, rẻ trước', async () => {
        const expensive = await repos.packages.create(makePackage({ priceVnd: 5_000_000 }));
        const cheap = await repos.packages.create(makePackage({ priceVnd: 1_000_000 }));
        await repos.packages.create(makePackage({ status: 'draft' }));
        await repos.packages.create(makePackage({ creatorId: 'crt_khac' }));

        const published = await repos.packages.findPublishedByCreator({
          creatorId: 'crt_fixture',
          page: 1,
          limit: 10,
        });
        expect(published.items.map((pkg) => pkg.id)).toEqual([cheap.id, expensive.id]);
        expect(published.total).toBe(2);
      });

      it('chủ hồ sơ thấy mọi trạng thái package của mình', async () => {
        await repos.packages.create(makePackage({ status: 'draft' }));
        await repos.packages.create(makePackage({ status: 'hidden' }));
        await repos.packages.create(makePackage({ creatorId: 'crt_khac' }));

        expect(await repos.packages.findAllByCreator('crt_fixture')).toHaveLength(2);
      });

      it('màn moderation lọc theo trạng thái trên mọi creator', async () => {
        await repos.packages.create(makePackage({ creatorId: 'crt_a', status: 'hidden' }));
        await repos.packages.create(makePackage({ creatorId: 'crt_b', status: 'hidden' }));
        await repos.packages.create(makePackage({ creatorId: 'crt_c' }));

        expect((await repos.packages.findAllForAdmin({ page: 1, limit: 10 })).total).toBe(3);
        const hidden = await repos.packages.findAllForAdmin({
          status: 'hidden',
          page: 1,
          limit: 10,
        });
        expect(hidden.total).toBe(2);
      });

      it('tạo sinh id mới, cập nhật giữ id, xóa trả về có xóa được hay không', async () => {
        const created = await repos.packages.create(makePackage({ id: 'bi-bo-qua' }));
        expect(created.id).toMatch(/^pkg_/);
        expect(created.addOns[0]?.label).toBe('Giao nhanh 48h');
        expect(created.usageRights.durationMonths).toBe(3);

        const updated = await repos.packages.update(created.id, {
          ...created,
          name: 'Tên mới',
          version: 2,
        });
        expect(updated?.id).toBe(created.id);
        expect(updated?.version).toBe(2);
        expect(await repos.packages.update('pkg_khong_co', makePackage())).toBeNull();

        expect(await repos.packages.delete(created.id)).toBe(true);
        expect(await repos.packages.delete(created.id)).toBe(false);
        expect(await repos.packages.findById(created.id)).toBeNull();
      });
    });


    describe('BrandRepository', () => {
      it('tạo, tìm theo user, cập nhật và lọc theo trạng thái', async () => {
        const created = await repos.brands.create(makeBrand({ id: 'bi-bo-qua' }));
        expect(created.id).toMatch(/^brd_/);
        expect(created.contact.phone).toBe('0900000000');

        expect((await repos.brands.findByUserId('usr_brand'))?.id).toBe(created.id);
        expect(await repos.brands.findByUserId('usr_khac')).toBeNull();

        const updated = await repos.brands.update(created.id, { ...created, status: 'verified' });
        expect(updated?.status).toBe('verified');
        expect(await repos.brands.update('brd_khong_co', makeBrand())).toBeNull();

        await repos.brands.create(makeBrand({ userId: 'usr_2', status: 'pending_review' }));
        const queue = await repos.brands.findByStatus(['pending_review']);
        expect(queue).toHaveLength(1);
      });

      it('thêm tài liệu xác minh vào cuối danh sách', async () => {
        const created = await repos.brands.create(makeBrand());
        const doc = {
          id: 'doc_1',
          fileName: 'gpkd.pdf',
          storageKey: 'private/gpkd.pdf',
          uploadedAt: '2026-08-01T00:00:00.000Z',
        };

        const withDoc = await repos.brands.addVerificationDoc(created.id, doc);
        expect(withDoc?.verificationDocs).toEqual([doc]);

        const withTwo = await repos.brands.addVerificationDoc(created.id, { ...doc, id: 'doc_2' });
        expect(withTwo?.verificationDocs.map((item) => item.id)).toEqual(['doc_1', 'doc_2']);

        expect(await repos.brands.addVerificationDoc('brd_khong_co', doc)).toBeNull();
      });
    });


    describe('BookingRepository', () => {
      it('tạo sinh id mới và giữ nguyên brief, totals, timeline', async () => {
        const created = await repos.bookings.create(makeBooking({ id: 'bi-bo-qua' }));

        expect(created.id).toMatch(/^bkg_/);
        const found = await repos.bookings.findById(created.id);
        expect(found?.brief.mustHaveScenes).toEqual(['cận ly trà sữa']);
        expect(found?.totals.totalVnd).toBe(3_696_000);
        expect(found?.timeline[0]?.action).toBe('booking.create');
        expect(found?.snapshot).toBeNull();
      });

      it('tra cứu theo mã và cập nhật giữ id', async () => {
        const created = await repos.bookings.create(makeBooking());

        expect((await repos.bookings.findByCode('KB-260801-0001'))?.id).toBe(created.id);
        expect(await repos.bookings.findByCode('KB-KHONG-CO')).toBeNull();

        const updated = await repos.bookings.update(created.id, {
          ...created,
          status: 'confirmed',
          updatedAt: '2026-08-02T00:00:00.000Z',
        });
        expect(updated?.id).toBe(created.id);
        expect(updated?.status).toBe('confirmed');
        expect(await repos.bookings.update('bkg_khong_co', makeBooking())).toBeNull();
      });

      it('lọc theo brand, theo creator và theo trạng thái, mới cập nhật lên đầu', async () => {
        const older = await repos.bookings.create(
          makeBooking({ code: 'KB-1', updatedAt: '2026-08-01T00:00:00.000Z' }),
        );
        const newer = await repos.bookings.create(
          makeBooking({ code: 'KB-2', updatedAt: '2026-08-03T00:00:00.000Z', status: 'confirmed' }),
        );
        await repos.bookings.create(
          makeBooking({ code: 'KB-3', brandUserId: 'usr_brand_2', creatorId: 'crt_khac' }),
        );

        const ofBrand = await repos.bookings.findByBrand('usr_brand', { page: 1, limit: 10 });
        expect(ofBrand.items.map((item) => item.id)).toEqual([newer.id, older.id]);
        expect(ofBrand.total).toBe(2);

        const ofCreator = await repos.bookings.findByCreator('crt_fixture', { page: 1, limit: 10 });
        expect(ofCreator.total).toBe(2);

        const confirmed = await repos.bookings.findByBrand('usr_brand', {
          status: 'confirmed',
          page: 1,
          limit: 10,
        });
        expect(confirmed.items.map((item) => item.code)).toEqual(['KB-2']);

        expect((await repos.bookings.findAll({ page: 1, limit: 10 })).total).toBe(3);
        const paged = await repos.bookings.findAll({ page: 2, limit: 2 });
        expect(paged.items).toHaveLength(1);
        expect(paged.total).toBe(3);
      });

      it('chỉ coi là hết hạn những booking còn chờ phản hồi hoặc chờ thanh toán', async () => {
        await repos.bookings.create(
          makeBooking({ code: 'KB-A', expiresAt: '2026-08-10T00:00:00.000Z' }),
        );
        await repos.bookings.create(
          makeBooking({
            code: 'KB-B',
            status: 'awaiting_payment',
            expiresAt: '2026-08-20T00:00:00.000Z',
          }),
        );
        await repos.bookings.create(
          makeBooking({
            code: 'KB-C',
            status: 'confirmed',
            expiresAt: '2026-08-10T00:00:00.000Z',
          }),
        );
        await repos.bookings.create(makeBooking({ code: 'KB-D', expiresAt: null }));

        const expired = await repos.bookings.findExpired('2026-08-15T00:00:00.000Z');
        expect(expired.map((item) => item.code)).toEqual(['KB-A']);
      });
    });


    describe('ConversationRepository', () => {
      it('mỗi cặp brand-creator là một luồng duy nhất', async () => {
        const created = await repos.conversations.create({
          brandUserId: 'usr_brand',
          creatorId: 'crt_1',
          creatorUserId: 'usr_creator',
        });

        expect(created.id).toMatch(/^cnv_/);
        expect(created.lastMessageAt).toBeNull();
        expect((await repos.conversations.findByPair('usr_brand', 'crt_1'))?.id).toBe(created.id);
        expect(await repos.conversations.findByPair('usr_brand', 'crt_9')).toBeNull();
        expect((await repos.conversations.findById(created.id))?.creatorUserId).toBe('usr_creator');
      });

      it('luồng vừa có tin nhắn được đẩy lên đầu danh sách', async () => {
        const first = await repos.conversations.create({
          brandUserId: 'usr_brand',
          creatorId: 'crt_1',
          creatorUserId: null,
        });
        await tick();
        const second = await repos.conversations.create({
          brandUserId: 'usr_brand',
          creatorId: 'crt_2',
          creatorUserId: null,
        });

        // Chưa có tin nhắn: luồng mới tạo đứng trước.
        const byCreatedAt = await repos.conversations.listByBrand('usr_brand');
        expect(byCreatedAt.map((item) => item.id)).toEqual([second.id, first.id]);

        await repos.conversations.touch(first.id, '2026-09-01T00:00:00.000Z');
        const byLastMessage = await repos.conversations.listByBrand('usr_brand');
        expect(byLastMessage.map((item) => item.id)).toEqual([first.id, second.id]);
        expect(byLastMessage[0]?.lastMessageAt).toBe('2026-09-01T00:00:00.000Z');

        expect(await repos.conversations.listByCreator('crt_1')).toHaveLength(1);
      });
    });


    describe('MessageRepository', () => {
      const message = {
        conversationId: 'cnv_1',
        bookingId: null,
        senderUserId: 'usr_brand',
        senderRole: 'brand' as const,
        type: 'text' as const,
        body: 'Chào bạn',
        fileUrl: null,
        fileName: null,
        offPlatformFlagged: false,
      };

      it('người gửi mặc nhiên đã đọc tin của chính mình', async () => {
        const created = await repos.messages.create(message);

        expect(created.id).toMatch(/^msg_/);
        expect(created.readByUserIds).toEqual(['usr_brand']);
        expect(created.deletedAt).toBeNull();
        expect(await repos.messages.findById(created.id)).toEqual(created);
        expect(await repos.messages.findById('msg_khong_co')).toBeNull();
      });

      it('liệt kê theo thứ tự thời gian tăng dần, có phân trang', async () => {
        const first = await repos.messages.create(message);
        await tick();
        const second = await repos.messages.create({ ...message, body: 'Tin sau' });
        await repos.messages.create({ ...message, conversationId: 'cnv_khac' });

        const page = await repos.messages.listByConversation({
          conversationId: 'cnv_1',
          page: 1,
          limit: 10,
        });
        expect(page.items.map((item) => item.id)).toEqual([first.id, second.id]);
        expect(page.total).toBe(2);

        const second_page = await repos.messages.listByConversation({
          conversationId: 'cnv_1',
          page: 2,
          limit: 1,
        });
        expect(second_page.items.map((item) => item.id)).toEqual([second.id]);
        expect(second_page.total).toBe(2);
      });

      it('đánh dấu đã đọc là idempotent và đếm đúng số tin chưa đọc', async () => {
        await repos.messages.create(message);
        await repos.messages.create({ ...message, body: 'Tin 2' });
        await repos.messages.create({ ...message, conversationId: 'cnv_khac' });

        expect(await repos.messages.countUnread('cnv_1', 'usr_creator')).toBe(2);
        expect(await repos.messages.countUnread('cnv_1', 'usr_brand')).toBe(0);

        expect(await repos.messages.markRead('cnv_1', 'usr_creator')).toBe(2);
        expect(await repos.messages.markRead('cnv_1', 'usr_creator')).toBe(0);
        expect(await repos.messages.countUnread('cnv_1', 'usr_creator')).toBe(0);
        // Luồng khác không bị ảnh hưởng.
        expect(await repos.messages.countUnread('cnv_khac', 'usr_creator')).toBe(1);
      });

      it('xóa mềm giữ lại bản ghi để phân xử', async () => {
        const created = await repos.messages.create(message);

        const deleted = await repos.messages.softDelete(created.id);
        expect(deleted?.deletedAt).not.toBeNull();
        expect(deleted?.body).toBe('Chào bạn');
        expect(await repos.messages.findById(created.id)).not.toBeNull();
        expect(await repos.messages.softDelete('msg_khong_co')).toBeNull();
      });
    });


    describe('SubmissionRepository', () => {
      const submission = {
        bookingId: 'bkg_1',
        note: 'Bản đầu',
        items: [
          {
            deliverableIndex: 0,
            fileUrl: 'https://cdn.vn/v1.mp4',
            linkUrl: null,
            description: 'video 60s',
          },
        ],
        postingProofs: [{ platform: 'tiktok', url: 'https://tiktok.com/v/1' }],
        submittedByUserId: 'usr_creator',
      };

      it('tự tăng version theo từng booking, không ghi đè bản cũ', async () => {
        const v1 = await repos.submissions.create(submission);
        const v2 = await repos.submissions.create({ ...submission, note: 'Bản sửa' });
        const other = await repos.submissions.create({ ...submission, bookingId: 'bkg_2' });

        expect(v1.version).toBe(1);
        expect(v2.version).toBe(2);
        expect(other.version).toBe(1);
        expect(v1.id).toMatch(/^sub_/);

        const history = await repos.submissions.listByBooking('bkg_1');
        expect(history.map((item) => item.version)).toEqual([1, 2]);
        expect(history[0]?.items[0]?.fileUrl).toBe('https://cdn.vn/v1.mp4');
        expect(history[0]?.postingProofs[0]?.platform).toBe('tiktok');

        expect((await repos.submissions.latest('bkg_1'))?.note).toBe('Bản sửa');
        expect(await repos.submissions.latest('bkg_khong_co')).toBeNull();
      });

      it('đếm số lần yêu cầu sửa theo booking', async () => {
        const revision = {
          bookingId: 'bkg_1',
          submissionVersion: 1,
          reason: 'Chưa nêu khuyến mãi',
          requestedByUserId: 'usr_brand',
        };

        await repos.submissions.createRevision(revision);
        await tick();
        await repos.submissions.createRevision({ ...revision, reason: 'Sai logo' });
        await repos.submissions.createRevision({ ...revision, bookingId: 'bkg_2' });

        expect(await repos.submissions.countRevisions('bkg_1')).toBe(2);
        expect(await repos.submissions.countRevisions('bkg_2')).toBe(1);
        expect(await repos.submissions.countRevisions('bkg_khong_co')).toBe(0);

        const list = await repos.submissions.listRevisions('bkg_1');
        expect(list.map((item) => item.reason)).toEqual(['Chưa nêu khuyến mãi', 'Sai logo']);
        expect(list[0]?.id).toMatch(/^rev_/);
      });
    });


    describe('NotificationRepository', () => {
      const notification = {
        userId: 'usr_1',
        type: 'booking_status' as const,
        title: 'Booking đã xác nhận',
        body: 'KB-260801-0001 đã được xác nhận',
        link: '/bookings/bkg_1',
      };

      it('liệt kê mới nhất trước, kèm số chưa đọc không phụ thuộc bộ lọc', async () => {
        const first = await repos.notifications.create(notification);
        await tick();
        const second = await repos.notifications.create({ ...notification, title: 'Tin sau' });
        await repos.notifications.create({ ...notification, userId: 'usr_2' });

        const all = await repos.notifications.list({
          userId: 'usr_1',
          unreadOnly: false,
          page: 1,
          limit: 10,
        });
        expect(all.items.map((item) => item.id)).toEqual([second.id, first.id]);
        expect(all.total).toBe(2);
        expect(all.unreadCount).toBe(2);

        await repos.notifications.markRead(first.id, 'usr_1');

        const unread = await repos.notifications.list({
          userId: 'usr_1',
          unreadOnly: true,
          page: 1,
          limit: 10,
        });
        expect(unread.items.map((item) => item.id)).toEqual([second.id]);
        expect(unread.unreadCount).toBe(1);
      });

      it('không cho đọc hộ thông báo của người khác', async () => {
        const created = await repos.notifications.create(notification);

        expect(await repos.notifications.markRead(created.id, 'usr_2')).toBeNull();
        expect(await repos.notifications.markRead('ntf_khong_co', 'usr_1')).toBeNull();
        expect((await repos.notifications.markRead(created.id, 'usr_1'))?.readAt).not.toBeNull();
      });

      it('đánh dấu tất cả đã đọc chỉ tính những tin còn chưa đọc', async () => {
        await repos.notifications.create(notification);
        await repos.notifications.create({ ...notification, title: 'Tin 2' });
        await repos.notifications.create({ ...notification, userId: 'usr_2' });

        expect(await repos.notifications.markAllRead('usr_1')).toBe(2);
        expect(await repos.notifications.markAllRead('usr_1')).toBe(0);
        expect(await repos.notifications.countUnread('usr_1')).toBe(0);
        expect(await repos.notifications.countUnread('usr_2')).toBe(1);
      });
    });

  });
}

