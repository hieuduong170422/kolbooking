import { describe, expect, it } from 'vitest';
import { InMemoryCreatorRepository } from '../src/modules/creators/creator.repository.memory.js';
import { CREATOR_SEED } from '../src/modules/creators/creator.seed.js';
import type {
  Creator,
  CreatorListFilter,
  PortfolioItem,
} from '../src/modules/creators/creator.types.js';

/** Fixture tối thiểu hợp lệ — test tự chứa, không phụ thuộc seed thay đổi (T2). */
const baseCreator = (overrides: Partial<Creator> = {}): Creator => ({
  id: 'crt_test_placeholder',
  userId: null,
  displayName: 'Creator Test',
  avatarUrl: null,
  bio: 'Bio test cho repository creator.',
  city: 'Hà Nội',
  niches: ['f&b'],
  language: 'vi',
  creatorType: 'koc',
  status: 'draft',
  statusReason: null,
  socialAccounts: [],
  audienceMetrics: null,
  serviceMode: 'both',
  availability: { availableDays: [], isPaused: false },
  portfolioItems: [],
  priceFromVnd: 1_000_000,
  rating: 0,
  completedBookings: 0,
  createdAt: '2026-08-05T00:00:00.000Z',
  ...overrides,
});

const portfolioItem = (overrides: Partial<PortfolioItem> = {}): PortfolioItem => ({
  id: 'pf_test_1',
  type: 'image',
  url: '/uploads/test.png',
  caption: null,
  category: null,
  thumbnailUrl: null,
  createdAt: '2026-08-05T00:00:00.000Z',
  ...overrides,
});

const baseFilter: CreatorListFilter = { sort: 'rating', page: 1, limit: 12 };

describe('InMemoryCreatorRepository.findByUserId', () => {
  it('trả về creator khớp userId sau khi create (CRE-001)', async () => {
    const repo = new InMemoryCreatorRepository(CREATOR_SEED);
    const created = await repo.create(baseCreator({ userId: 'usr_creator_a' }));

    const found = await repo.findByUserId('usr_creator_a');
    expect(found?.id).toBe(created.id);
    expect(found?.displayName).toBe('Creator Test');
  });

  it('trả về null khi không có creator liên kết userId đó (CRE-001)', async () => {
    const repo = new InMemoryCreatorRepository(CREATOR_SEED);
    expect(await repo.findByUserId('usr_khong_ton_tai')).toBeNull();
  });
});

describe('InMemoryCreatorRepository.create', () => {
  it('gán id dạng crt_ + uuid và lưu vào store (CRE-001)', async () => {
    const repo = new InMemoryCreatorRepository(CREATOR_SEED);
    const created = await repo.create(baseCreator({ userId: 'usr_creator_a' }));

    expect(created.id).toMatch(/^crt_[0-9a-f-]{36}$/);
    const found = await repo.findById(created.id);
    expect(found?.displayName).toBe('Creator Test');
    expect(found?.userId).toBe('usr_creator_a');
  });

  it('trả về bản sao bất biến — mutate kết quả không ảnh hưởng store (CRE-001)', async () => {
    const repo = new InMemoryCreatorRepository(CREATOR_SEED);
    const created = await repo.create(
      baseCreator({ userId: 'usr_creator_a', niches: ['f&b'] }),
    );

    (created as { displayName: string }).displayName = 'Bị sửa';
    (created as { niches: string[] }).niches.push('HACK');

    const found = await repo.findByUserId('usr_creator_a');
    expect(found?.displayName).toBe('Creator Test');
    expect(found?.niches).toEqual(['f&b']);
  });
});

describe('InMemoryCreatorRepository.update', () => {
  it('full replace — thay toàn bộ field theo input và trả bản copy (CRE-002)', async () => {
    const repo = new InMemoryCreatorRepository(CREATOR_SEED);
    const updated = await repo.update(
      'crt_0001',
      baseCreator({ id: 'crt_0001', displayName: 'Lan Chi Mới', status: 'pending_review' }),
    );

    expect(updated?.displayName).toBe('Lan Chi Mới');
    expect(updated?.status).toBe('pending_review');
    expect(updated?.bio).toBe('Bio test cho repository creator.');

    const found = await repo.findById('crt_0001');
    expect(found?.displayName).toBe('Lan Chi Mới');
    expect(found?.bio).toBe('Bio test cho repository creator.');
  });

  it('luôn giữ id từ param khi full replace (CRE-002)', async () => {
    const repo = new InMemoryCreatorRepository(CREATOR_SEED);
    const updated = await repo.update(
      'crt_0001',
      baseCreator({ id: 'crt_OTHER', displayName: 'X' }),
    );
    expect(updated?.id).toBe('crt_0001');
  });

  it('trả về null khi id không tồn tại (CRE-002)', async () => {
    const repo = new InMemoryCreatorRepository(CREATOR_SEED);
    expect(await repo.update('crt_zzzz', baseCreator())).toBeNull();
  });

  it('trả về bản sao bất biến — mutate kết quả không ảnh hưởng store (CRE-002)', async () => {
    const repo = new InMemoryCreatorRepository(CREATOR_SEED);
    const updated = await repo.update(
      'crt_0001',
      baseCreator({ id: 'crt_0001', displayName: 'Lan Chi Mới' }),
    );

    (updated as { displayName: string }).displayName = 'Bị sửa';
    (updated as { niches: string[] }).niches.push('HACK');

    const found = await repo.findById('crt_0001');
    expect(found?.displayName).toBe('Lan Chi Mới');
    expect(found?.niches).toEqual(['f&b']);
  });
});

describe('InMemoryCreatorRepository.findByStatusForReview', () => {
  it('trả về đúng creator có status nằm trong danh sách — kể cả pending/draft (CRE-008)', async () => {
    const repo = new InMemoryCreatorRepository(CREATOR_SEED);
    const created = await repo.create(
      baseCreator({ userId: 'usr_creator_a', status: 'draft' }),
    );

    const queue = await repo.findByStatusForReview(['pending_review', 'draft', 'info_required']);
    const queueIds = queue.map((creator) => creator.id);

    expect(queueIds).toContain('crt_0005'); // pending_review từ seed
    expect(queueIds).toContain(created.id); // draft vừa tạo
    expect(
      queue.every((creator) =>
        ['pending_review', 'draft', 'info_required'].includes(creator.status),
      ),
    ).toBe(true);
  });

  it('KHÔNG lọc verified-only như findAll — findAll vẫn chỉ trả verified (CRE-008, BR-001)', async () => {
    const repo = new InMemoryCreatorRepository(CREATOR_SEED);
    const draft = await repo.create(
      baseCreator({ userId: 'usr_creator_a', status: 'draft' }),
    );

    const queue = await repo.findByStatusForReview(['pending_review', 'draft']);
    expect(queue.some((creator) => creator.status === 'verified')).toBe(false);

    const all = await repo.findAll(baseFilter);
    expect(all.total).toBe(4);
    expect(all.items.some((creator) => creator.id === draft.id)).toBe(false);
  });
});

describe('InMemoryCreatorRepository.findForReviewById', () => {
  it('trả về creator chưa verified (pending_review) — admin xem được queue (CRE-008)', async () => {
    const repo = new InMemoryCreatorRepository(CREATOR_SEED);
    const found = await repo.findForReviewById('crt_0005');
    expect(found?.status).toBe('pending_review');
  });

  it('trả về null khi id không tồn tại (CRE-008)', async () => {
    const repo = new InMemoryCreatorRepository(CREATOR_SEED);
    expect(await repo.findForReviewById('crt_zzzz')).toBeNull();
  });
});

describe('InMemoryCreatorRepository.addPortfolioItem', () => {
  it('thêm item vào cuối portfolio và persist (CRE-004)', async () => {
    const repo = new InMemoryCreatorRepository(CREATOR_SEED);
    const updated = await repo.addPortfolioItem('crt_0001', portfolioItem({ id: 'pf_1' }));

    expect(updated?.portfolioItems).toHaveLength(1);
    expect(updated?.portfolioItems[0]?.id).toBe('pf_1');

    const found = await repo.findById('crt_0001');
    expect(found?.portfolioItems).toHaveLength(1);
    expect(found?.portfolioItems[0]?.url).toBe('/uploads/test.png');
  });

  it('trả về null khi creator không tồn tại (CRE-004)', async () => {
    const repo = new InMemoryCreatorRepository(CREATOR_SEED);
    expect(await repo.addPortfolioItem('crt_zzzz', portfolioItem())).toBeNull();
  });

  it('trả về bản sao bất biến — mutate kết quả không ảnh hưởng store (CRE-004)', async () => {
    const repo = new InMemoryCreatorRepository(CREATOR_SEED);
    const updated = await repo.addPortfolioItem('crt_0001', portfolioItem({ id: 'pf_1' }));

    (updated as { portfolioItems: PortfolioItem[] }).portfolioItems[0]!.caption = 'Bị sửa';

    const found = await repo.findById('crt_0001');
    expect(found?.portfolioItems[0]?.caption).toBeNull();
  });
});

describe('InMemoryCreatorRepository.removePortfolioItem', () => {
  it('xóa item khỏi portfolio theo itemId và persist (CRE-004)', async () => {
    const repo = new InMemoryCreatorRepository(CREATOR_SEED);
    await repo.addPortfolioItem('crt_0001', portfolioItem({ id: 'pf_1' }));
    await repo.addPortfolioItem('crt_0001', portfolioItem({ id: 'pf_2', url: '/uploads/2.png' }));

    const updated = await repo.removePortfolioItem('crt_0001', 'pf_1');
    expect(updated?.portfolioItems.map((item) => item.id)).toEqual(['pf_2']);

    const found = await repo.findById('crt_0001');
    expect(found?.portfolioItems.map((item) => item.id)).toEqual(['pf_2']);
  });

  it('trả về null khi creator không tồn tại (CRE-004)', async () => {
    const repo = new InMemoryCreatorRepository(CREATOR_SEED);
    expect(await repo.removePortfolioItem('crt_zzzz', 'pf_1')).toBeNull();
  });

  it('trả creator không đổi khi item không tồn tại — idempotent (CRE-004)', async () => {
    const repo = new InMemoryCreatorRepository(CREATOR_SEED);
    const result = await repo.removePortfolioItem('crt_0001', 'pf_404');
    expect(result).not.toBeNull();
    expect(result?.portfolioItems).toEqual([]);
  });
});
