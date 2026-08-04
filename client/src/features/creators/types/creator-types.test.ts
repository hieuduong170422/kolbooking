import { describe, expect, it } from 'vitest';
import {
  CREATOR_DAY_OF_WEEK_LABELS,
  CREATOR_DAYS_OF_WEEK,
  CREATOR_LANGUAGES,
  CREATOR_STATUSES,
  CREATOR_STATUS_LABELS,
  PORTFOLIO_ITEM_TYPES,
  SERVICE_MODE_LABELS,
  SERVICE_MODES,
  type AudienceMetrics,
  type AvailabilityUpdate,
  type Creator,
  type CreatorAdmin,
  type CreatorOwner,
  type CreatorProfileInput,
  type PortfolioItem,
} from './creator-types';

const sortKeys = (obj: object): string[] => Object.keys(obj).sort();

describe('CREATOR_STATUS_LABELS (CRE-007)', () => {
  it('có đủ 6 trạng thái với nhãn tiếng Việt chính xác', () => {
    expect(CREATOR_STATUS_LABELS).toEqual({
      draft: 'Bản nháp',
      pending_review: 'Chờ duyệt',
      info_required: 'Chờ bổ sung thông tin',
      verified: 'Đã duyệt',
      rejected: 'Bị từ chối',
      suspended: 'Tạm khóa',
    });
  });

  it('CREATOR_STATUSES bao gồm info_required và giữ đúng thứ tự server', () => {
    expect(CREATOR_STATUSES).toEqual([
      'draft',
      'pending_review',
      'verified',
      'rejected',
      'suspended',
      'info_required',
    ]);
  });
});

describe('SERVICE_MODE_LABELS (CRE-006)', () => {
  it('có đủ 3 mode với nhãn đúng', () => {
    expect(SERVICE_MODES).toEqual(['online', 'offline', 'both']);
    expect(SERVICE_MODE_LABELS).toEqual({
      online: 'Online',
      offline: 'Offline',
      both: 'Online & Offline',
    });
  });
});

describe('CREATOR_DAY_OF_WEEK_LABELS (CRE-010)', () => {
  it('có đủ 7 ngày trong tuần với nhãn tiếng Việt', () => {
    expect(CREATOR_DAYS_OF_WEEK).toEqual(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
    expect(CREATOR_DAY_OF_WEEK_LABELS).toEqual({
      mon: 'Thứ 2',
      tue: 'Thứ 3',
      wed: 'Thứ 4',
      thu: 'Thứ 5',
      fri: 'Thứ 6',
      sat: 'Thứ 7',
      sun: 'Chủ nhật',
    });
  });
});

describe('CreatorOwner mirror (CRE-001..010)', () => {
  const owner: CreatorOwner = {
    id: 'crt_0001',
    displayName: 'Creator Demo',
    avatarUrl: null,
    bio: 'Creator chuyên review ẩm thực.',
    city: 'Hà Nội',
    niches: ['f&b'],
    language: 'vi',
    creatorType: 'koc',
    socialAccounts: [],
    status: 'draft',
    statusReason: null,
    audienceMetrics: null,
    serviceMode: 'both',
    availability: { availableDays: ['mon', 'tue'], isPaused: false },
    portfolioItems: [],
    priceFromVnd: 500000,
    rating: 0,
    completedBookings: 0,
    createdAt: '2026-08-01T00:00:00.000Z',
  };

  it('có đủ 19 field của owner DTO', () => {
    expect(sortKeys(owner)).toEqual([
      'audienceMetrics',
      'availability',
      'avatarUrl',
      'bio',
      'city',
      'completedBookings',
      'createdAt',
      'creatorType',
      'displayName',
      'id',
      'language',
      'niches',
      'portfolioItems',
      'priceFromVnd',
      'rating',
      'serviceMode',
      'socialAccounts',
      'status',
      'statusReason',
    ]);
  });

  it('CreatorAdmin bổ sung userEmail (CRE-008)', () => {
    const admin: CreatorAdmin = { ...owner, userEmail: 'creator@demo.vn' };
    expect(sortKeys(admin)).toEqual([...sortKeys(owner), 'userEmail']);
    expect(admin.userEmail).toBe('creator@demo.vn');
  });
});

describe('Creator public mirror (CRE-009)', () => {
  const pub: Creator = {
    id: 'crt_0001',
    displayName: 'Creator Demo',
    avatarUrl: null,
    bio: 'Creator chuyên review ẩm thực.',
    city: 'Hà Nội',
    niches: ['f&b'],
    language: 'vi',
    creatorType: 'koc',
    socialAccounts: [],
    audienceMetrics: null,
    serviceMode: 'both',
    portfolioItems: [],
    priceFromVnd: 500000,
    rating: 4.5,
    completedBookings: 10,
  };

  it('có đủ 15 field công khai (thêm avatarUrl/language/serviceMode/audienceMetrics/portfolioItems)', () => {
    expect(sortKeys(pub)).toEqual([
      'audienceMetrics',
      'avatarUrl',
      'bio',
      'city',
      'completedBookings',
      'creatorType',
      'displayName',
      'id',
      'language',
      'niches',
      'portfolioItems',
      'priceFromVnd',
      'rating',
      'serviceMode',
      'socialAccounts',
    ]);
  });

  it('không lộ availability/isPaused/statusReason/status (chống PII)', () => {
    const keys = sortKeys(pub);
    expect(keys).not.toContain('availability');
    expect(keys).not.toContain('isPaused');
    expect(keys).not.toContain('statusReason');
    expect(keys).not.toContain('status');
  });
});

describe('Const arrays mirror server (CRE-001..010)', () => {
  it('CREATOR_LANGUAGES giữ 2 ngôn ngữ', () => {
    expect(CREATOR_LANGUAGES).toEqual(['vi', 'en']);
  });

  it('PORTFOLIO_ITEM_TYPES giữ 3 loại', () => {
    expect(PORTFOLIO_ITEM_TYPES).toEqual(['image', 'video', 'link']);
  });
});

describe('Input mirrors (CRE-001..006, 010)', () => {
  it('CreatorProfileInput có đủ field cho PUT /me', () => {
    const input: CreatorProfileInput = {
      displayName: 'Creator Demo',
      bio: 'Creator chuyên review ẩm thực.',
      city: 'Hà Nội',
      niches: ['f&b'],
      language: 'vi',
      creatorType: 'koc',
      socialAccounts: [],
      audienceMetrics: null,
      serviceMode: 'both',
    };
    expect(sortKeys(input)).toEqual([
      'audienceMetrics',
      'bio',
      'city',
      'creatorType',
      'displayName',
      'language',
      'niches',
      'serviceMode',
      'socialAccounts',
    ]);

    const withAvatar: CreatorProfileInput = { ...input, avatarUrl: null };
    expect(sortKeys(withAvatar)).toContain('avatarUrl');
  });

  it('AvailabilityUpdate có availableDays + isPaused (CRE-010)', () => {
    const input: AvailabilityUpdate = { availableDays: ['mon', 'tue'], isPaused: true };
    expect(sortKeys(input)).toEqual(['availableDays', 'isPaused']);
  });

  it('PortfolioItem có đủ field (CRE-004)', () => {
    const item: PortfolioItem = {
      id: 'pf_0001',
      type: 'image',
      url: '/uploads/abc.png',
      caption: null,
      category: null,
      thumbnailUrl: null,
      createdAt: '2026-08-01T00:00:00.000Z',
    };
    expect(sortKeys(item)).toEqual([
      'caption',
      'category',
      'createdAt',
      'id',
      'thumbnailUrl',
      'type',
      'url',
    ]);
  });

  it('AudienceMetrics luôn tự khai báo (CRE-005)', () => {
    const metrics: AudienceMetrics = {
      followerCount: 1200,
      viewCount: 50000,
      updatedAt: '2026-08-01T00:00:00.000Z',
      isSelfReported: true,
    };
    expect(metrics.isSelfReported).toBe(true);
  });
});
