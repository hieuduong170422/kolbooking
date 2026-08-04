import { describe, expect, it } from 'vitest';
import { CREATOR_SEED } from '../src/modules/creators/creator.seed.js';

/**
 * Seed creators (T2) — khóa trạng thái dữ liệu mẫu cho dev/test.
 * Demo user `usr_demo_creator` (creator@demo.vn) phải có đúng 1 hồ sơ DRAFT,
 * còn `crt_0005` giữ nguyên pending_review để admin queue có nội dung (CRE-008).
 */

describe('CREATOR_SEED — hồ sơ demo (CRE-001)', () => {
  it('đúng 1 creator liên kết usr_demo_creator với trạng thái draft', () => {
    const demo = CREATOR_SEED.filter((c) => c.userId === 'usr_demo_creator');
    expect(demo).toHaveLength(1);
    expect(demo[0]?.status).toBe('draft');
    expect(demo[0]?.displayName).toBe('Creator Demo');
  });

  it('hồ sơ demo có dữ liệu thực tế để tái sử dụng (CRE-001..CRE-006)', () => {
    const demo = CREATOR_SEED.find((c) => c.userId === 'usr_demo_creator');
    expect(demo).toBeDefined();
    expect(demo?.bio.length).toBeGreaterThanOrEqual(20);
    expect(demo?.city).toBeTruthy();
    expect(demo?.niches.length).toBeGreaterThan(0);
    expect(demo?.language).toBe('vi');
    expect(demo?.creatorType).toBe('koc');
    expect(demo?.socialAccounts.length).toBeGreaterThan(0);
    expect(demo?.serviceMode).toBe('both');
    expect(demo?.availability.availableDays.length).toBeGreaterThanOrEqual(2);
    expect(demo?.portfolioItems).toEqual([]);
    expect(demo?.statusReason).toBeNull();
    expect(demo?.priceFromVnd).toBeGreaterThan(0);
  });

  it('crt_0001..crt_0005 giữ nguyên id và trạng thái gốc', () => {
    const byId = new Map(CREATOR_SEED.map((c) => [c.id, c]));
    expect(byId.get('crt_0001')?.status).toBe('verified');
    expect(byId.get('crt_0002')?.status).toBe('verified');
    expect(byId.get('crt_0003')?.status).toBe('verified');
    expect(byId.get('crt_0004')?.status).toBe('verified');
    expect(byId.get('crt_0005')?.status).toBe('pending_review');
  });

  it('chỉ 4 creator verified — draft không được tính vào danh sách công khai (CRE-007)', () => {
    const verified = CREATOR_SEED.filter((c) => c.status === 'verified');
    expect(verified).toHaveLength(4);
  });

  it('mọi creator có đầy đủ trường mới, không trường nào undefined (CRE-001..CRE-010)', () => {
    for (const c of CREATOR_SEED) {
      expect(c.userId).toBeDefined();
      expect(c.avatarUrl).toBeDefined();
      expect(c.language).toBeDefined();
      expect(c.serviceMode).toBeDefined();
      expect(c.audienceMetrics).toBeDefined();
      expect(c.availability).toBeDefined();
      expect(c.availability.availableDays).toBeDefined();
      expect(c.availability.isPaused).toBeDefined();
      expect(c.portfolioItems).toBeDefined();
      expect(c.statusReason).toBeDefined();
    }
  });

  it('hồ sơ demo có thời gian tạo gần đây (sau baseline seed 2026-07-01)', () => {
    const demo = CREATOR_SEED.find((c) => c.userId === 'usr_demo_creator');
    expect(new Date(demo?.createdAt ?? 0).getTime()).toBeGreaterThan(
      new Date('2026-07-01T08:00:00.000Z').getTime(),
    );
  });
});
