import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  REPOSITORY_DRIVERS,
  closeTestPool,
  type RepositorySet,
} from './helpers/repository-drivers.js';
/**
 * Test hợp đồng tầng lưu trữ — nhóm danh tính và vận hành: tài khoản, phiên
 * đăng nhập, mã xác minh, danh sách đã lưu, báo cáo vi phạm, audit log.
 * Nhóm sàn (creator, package, booking, chat) nằm ở
 * repositories.marketplace.contract.test.ts.
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

    describe('UserRepository', () => {
      const input = {
        email: 'Brand@Demo.VN',
        passwordHash: 'hash',
        displayName: 'Brand Demo',
        role: 'brand' as const,
        consent: { version: '2026-08-mvp', acceptedAt: '2026-08-01T00:00:00.000Z', source: 'web' },
      };

      it('tạo tài khoản, chuẩn hóa email và tìm được không phân biệt hoa thường', async () => {
        const created = await repos.users.create(input);

        expect(created.id).toMatch(/^usr_/);
        expect(created.email).toBe('brand@demo.vn');
        expect(created.status).toBe('active');
        expect(created.emailVerifiedAt).toBeNull();
        expect(created.consent).toEqual(input.consent);

        const found = await repos.users.findByEmail('BRAND@demo.vn');
        expect(found).toEqual(created);
        expect(await repos.users.findById(created.id)).toEqual(created);
      });

      it('không tìm thấy thì trả null chứ không ném lỗi', async () => {
        expect(await repos.users.findById('usr_khong_ton_tai')).toBeNull();
        expect(await repos.users.findByEmail('ai@do.vn')).toBeNull();
        expect(await repos.users.update('usr_khong_ton_tai', { status: 'locked' })).toBeNull();
      });

      it('cập nhật từng phần, giữ nguyên trường không nằm trong patch', async () => {
        const created = await repos.users.create(input);

        const locked = await repos.users.update(created.id, { status: 'locked' });
        expect(locked?.status).toBe('locked');
        expect(locked?.displayName).toBe('Brand Demo');
        expect(locked?.passwordHash).toBe('hash');

        const verified = await repos.users.update(created.id, {
          emailVerifiedAt: '2026-08-02T00:00:00.000Z',
        });
        expect(verified?.emailVerifiedAt).toBe('2026-08-02T00:00:00.000Z');
        expect(verified?.status).toBe('locked');

        // Đặt lại null là thao tác hợp lệ, không phải "bỏ qua trường".
        const reset = await repos.users.update(created.id, { emailVerifiedAt: null });
        expect(reset?.emailVerifiedAt).toBeNull();
      });

      it('lọc theo vai trò, trạng thái và từ khóa; phân trang có tổng đúng', async () => {
        await repos.users.create(input);
        await tick();
        await repos.users.create({ ...input, email: 'creator@demo.vn', role: 'creator' });
        await tick();
        const third = await repos.users.create({
          ...input,
          email: 'ops@demo.vn',
          displayName: 'Ops Team',
        });
        await repos.users.update(third.id, { status: 'locked' });

        const brands = await repos.users.findAll({ role: 'brand', page: 1, limit: 10 });
        expect(brands.total).toBe(2);

        const locked = await repos.users.findAll({ status: 'locked', page: 1, limit: 10 });
        expect(locked.items.map((user) => user.email)).toEqual(['ops@demo.vn']);

        // Khớp một phần, không phân biệt hoa thường, trên cả email lẫn tên.
        const byName = await repos.users.findAll({ search: 'ops te', page: 1, limit: 10 });
        expect(byName.items.map((user) => user.email)).toEqual(['ops@demo.vn']);
        const byEmail = await repos.users.findAll({ search: 'DEMO.VN', page: 1, limit: 10 });
        expect(byEmail.total).toBe(3);

        // Mới nhất lên đầu.
        const firstPage = await repos.users.findAll({ page: 1, limit: 2 });
        expect(firstPage.items.map((user) => user.email)).toEqual([
          'ops@demo.vn',
          'creator@demo.vn',
        ]);
        expect(firstPage.total).toBe(3);

        const secondPage = await repos.users.findAll({ page: 2, limit: 2 });
        expect(secondPage.items.map((user) => user.email)).toEqual(['brand@demo.vn']);
        expect(secondPage.total).toBe(3);

        // Trang vượt quá dữ liệu vẫn phải báo đúng tổng.
        const emptyPage = await repos.users.findAll({ page: 9, limit: 2 });
        expect(emptyPage.items).toEqual([]);
        expect(emptyPage.total).toBe(3);
      });
    });


    describe('SessionRepository', () => {
      const session = {
        tokenHash: 'hash-1',
        userId: 'usr_1',
        expiresAt: '2026-09-01T00:00:00.000Z',
        revokedAt: null,
      };

      it('lưu, đọc và thu hồi một phiên', async () => {
        await repos.sessions.create(session);
        expect(await repos.sessions.findByTokenHash('hash-1')).toEqual(session);
        expect(await repos.sessions.findByTokenHash('khong-co')).toBeNull();

        await repos.sessions.revoke('hash-1');
        const revoked = await repos.sessions.findByTokenHash('hash-1');
        expect(revoked?.revokedAt).not.toBeNull();

        // Thu hồi lần hai không được ghi đè mốc thu hồi ban đầu.
        const revokedAt = revoked?.revokedAt;
        await repos.sessions.revoke('hash-1');
        expect((await repos.sessions.findByTokenHash('hash-1'))?.revokedAt).toBe(revokedAt);
      });

      it('thu hồi toàn bộ phiên của một user, không đụng user khác', async () => {
        await repos.sessions.create(session);
        await repos.sessions.create({ ...session, tokenHash: 'hash-2' });
        await repos.sessions.create({ ...session, tokenHash: 'hash-3', userId: 'usr_2' });

        await repos.sessions.revokeAllForUser('usr_1');

        expect((await repos.sessions.findByTokenHash('hash-1'))?.revokedAt).not.toBeNull();
        expect((await repos.sessions.findByTokenHash('hash-2'))?.revokedAt).not.toBeNull();
        expect((await repos.sessions.findByTokenHash('hash-3'))?.revokedAt).toBeNull();
      });
    });


    describe('VerificationTokenRepository', () => {
      const input = {
        userId: 'usr_1',
        purpose: 'email_verify' as const,
        codeHash: 'code-hash',
        expiresAt: '2026-08-01T00:10:00.000Z',
      };

      it('trả về mã mới nhất còn hiệu lực theo từng mục đích', async () => {
        await repos.verificationTokens.create(input);
        await tick();
        const newest = await repos.verificationTokens.create({ ...input, codeHash: 'moi-hon' });
        await repos.verificationTokens.create({ ...input, purpose: 'password_reset' });

        const latest = await repos.verificationTokens.findLatestActive('usr_1', 'email_verify');
        expect(latest?.id).toBe(newest.id);
        expect(latest?.attemptCount).toBe(0);

        const reset = await repos.verificationTokens.findLatestActive('usr_1', 'password_reset');
        expect(reset?.purpose).toBe('password_reset');
        expect(await repos.verificationTokens.findLatestActive('usr_2', 'email_verify')).toBeNull();
      });

      it('đếm số lần nhập sai và tiêu hủy mã', async () => {
        const token = await repos.verificationTokens.create(input);

        expect((await repos.verificationTokens.incrementAttempts(token.id))?.attemptCount).toBe(1);
        expect((await repos.verificationTokens.incrementAttempts(token.id))?.attemptCount).toBe(2);
        expect(await repos.verificationTokens.incrementAttempts('vtk_khong_co')).toBeNull();

        await repos.verificationTokens.markConsumed(token.id);
        expect(
          await repos.verificationTokens.findLatestActive('usr_1', 'email_verify'),
        ).toBeNull();
      });

      it('vô hiệu mọi mã đang chờ khi cấp mã mới', async () => {
        await repos.verificationTokens.create(input);
        await repos.verificationTokens.create({ ...input, codeHash: 'hash-2' });

        await repos.verificationTokens.invalidateAllFor('usr_1', 'email_verify');

        expect(
          await repos.verificationTokens.findLatestActive('usr_1', 'email_verify'),
        ).toBeNull();
      });
    });


    describe('FavoriteRepository', () => {
      it('lưu creator là idempotent, danh sách mới lưu trước', async () => {
        await repos.favorites.add('usr_1', 'crt_1');
        await tick();
        await repos.favorites.add('usr_1', 'crt_2');
        await repos.favorites.add('usr_1', 'crt_1');
        await repos.favorites.add('usr_2', 'crt_3');

        expect(await repos.favorites.listCreatorIds('usr_1')).toEqual(['crt_2', 'crt_1']);
        expect(await repos.favorites.has('usr_1', 'crt_1')).toBe(true);
        expect(await repos.favorites.has('usr_1', 'crt_3')).toBe(false);

        await repos.favorites.remove('usr_1', 'crt_1');
        expect(await repos.favorites.listCreatorIds('usr_1')).toEqual(['crt_2']);
        // Xóa thứ không có là no-op.
        await repos.favorites.remove('usr_1', 'crt_9');
        expect(await repos.favorites.listCreatorIds('usr_2')).toEqual(['crt_3']);
      });
    });


    describe('ReportRepository', () => {
      const report = {
        targetType: 'creator' as const,
        targetId: 'crt_1',
        reason: 'fake_profile' as const,
        description: 'Hồ sơ giả mạo người nổi tiếng',
        reporterUserId: 'usr_1',
      };

      it('ticket mới luôn ở trạng thái mở, cũ nhất xử lý trước', async () => {
        const first = await repos.reports.create(report);
        await tick();
        const second = await repos.reports.create({ ...report, reporterUserId: null });

        expect(first.id).toMatch(/^rpt_/);
        expect(first.status).toBe('open');
        expect(first.resolvedAt).toBeNull();
        expect(second.reporterUserId).toBeNull();

        const list = await repos.reports.list({ page: 1, limit: 10 });
        expect(list.items.map((item) => item.id)).toEqual([first.id, second.id]);
        expect(list.total).toBe(2);
      });

      it('đóng ticket ghi lại kết luận và thời điểm xử lý', async () => {
        const created = await repos.reports.create(report);

        const resolved = await repos.reports.resolve(created.id, 'resolved', 'Đã ẩn hồ sơ');
        expect(resolved?.status).toBe('resolved');
        expect(resolved?.resolutionNote).toBe('Đã ẩn hồ sơ');
        expect(resolved?.resolvedAt).not.toBeNull();

        expect((await repos.reports.list({ status: 'open', page: 1, limit: 10 })).total).toBe(0);
        expect((await repos.reports.list({ status: 'resolved', page: 1, limit: 10 })).total).toBe(1);
        expect(await repos.reports.resolve('rpt_khong_co', 'dismissed', '')).toBeNull();
        expect(await repos.reports.findById(created.id)).not.toBeNull();
      });
    });


    describe('AuditRepository', () => {
      const entry = {
        actorId: 'usr_admin',
        action: 'user.lock',
        targetType: 'user',
        targetId: 'usr_1',
        before: { status: 'active' },
        after: { status: 'locked' },
        reason: 'Vi phạm chính sách',
      };

      it('ghi lại nguyên trạng before/after và giữ thứ tự đã ghi', async () => {
        await repos.audit.create(entry);
        await repos.audit.create({ ...entry, action: 'user.unlock' });
        await repos.audit.create({ ...entry, targetType: 'creator', targetId: 'crt_1' });

        const all = await repos.audit.listAll();
        expect(all.map((item) => item.action)).toEqual(['user.lock', 'user.unlock', 'user.lock']);
        expect(all[0]?.before).toEqual({ status: 'active' });
        expect(all[0]?.after).toEqual({ status: 'locked' });
        expect(all[0]?.id).toMatch(/^aud_/);

        const ofTarget = await repos.audit.listByTarget('user', 'usr_1');
        expect(ofTarget).toHaveLength(2);
      });

      it('lọc theo loại đối tượng và một phần tên action, mới nhất lên đầu', async () => {
        await repos.audit.create(entry);
        await repos.audit.create({ ...entry, action: 'user.unlock' });
        await repos.audit.create({
          ...entry,
          action: 'creator.approve',
          targetType: 'creator',
          before: null,
          after: null,
        });

        const newestFirst = await repos.audit.list({ page: 1, limit: 10 });
        expect(newestFirst.items.map((item) => item.action)).toEqual([
          'creator.approve',
          'user.unlock',
          'user.lock',
        ]);
        expect(newestFirst.items[0]?.before).toBeNull();

        const ofUser = await repos.audit.list({ targetType: 'user', page: 1, limit: 10 });
        expect(ofUser.total).toBe(2);

        const byAction = await repos.audit.list({ action: 'user.', page: 1, limit: 10 });
        expect(byAction.total).toBe(2);

        const paged = await repos.audit.list({ page: 2, limit: 2 });
        expect(paged.items.map((item) => item.action)).toEqual(['user.lock']);
        expect(paged.total).toBe(3);
      });
    });
  });
}

