import { describe, expect, it } from 'vitest';
import {
  CREATOR_DAYS_OF_WEEK,
  CREATOR_LANGUAGES,
  CREATOR_STATUSES,
  PORTFOLIO_ITEM_TYPES,
  SERVICE_MODES,
} from '../src/modules/creators/creator.types.js';
import type {
  AvailabilityUpdate,
  Creator,
  CreatorAdminDto,
  CreatorOwnerDto,
  CreatorProfileInput,
} from '../src/modules/creators/creator.types.js';

/**
 * Contract freeze (T1) — khóa shape của domain types mở rộng.
 * Mọi thay đổi field/status sau này phải đi qua các assertion tại file này.
 * Test KHÔNG nằm trong tsconfig typecheck (server/tests bị exclude) nên
 * `satisfies` chỉ mang tính tài liệu — assertion runtime mới là cơ chế RED-GREEN thật.
 */

describe('CREATOR_STATUSES — trạng thái hồ sơ creator (CRE-007)', () => {
  it('giữ nguyên 5 trạng thái gốc và bổ sung info_required (additive)', () => {
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

describe('CreatorDayOfWeek — lịch nhận việc (CRE-010)', () => {
  it('định nghĩa đủ 7 ngày trong tuần', () => {
    expect(CREATOR_DAYS_OF_WEEK).toEqual(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  });
});

describe('CreatorLanguage + ServiceMode (CRE-001, CRE-006)', () => {
  it('ngôn ngữ hỗ trợ vi/en', () => {
    expect(CREATOR_LANGUAGES).toEqual(['vi', 'en']);
  });

  it('hình thức nhận booking: online/offline/both', () => {
    expect(SERVICE_MODES).toEqual(['online', 'offline', 'both']);
  });
});

describe('PortfolioItem — loại tệp portfolio (CRE-004)', () => {
  it('hỗ trợ image/video/link', () => {
    expect(PORTFOLIO_ITEM_TYPES).toEqual(['image', 'video', 'link']);
  });
});

/** Mẫu Creator đầy đủ — khóa toàn bộ field entity (cũ + mới, CRE-001..CRE-010). */
const fullCreator = {
  id: 'crt_0001',
  userId: 'usr_0001',
  displayName: 'Lan Chi Foodie',
  avatarUrl: 'https://cdn.example.com/avatar.jpg',
  bio: 'Food reviewer Hà Nội.',
  city: 'Hà Nội',
  niches: ['f&b', 'cafe'],
  language: 'vi',
  creatorType: 'koc',
  status: 'verified',
  statusReason: null,
  socialAccounts: [
    {
      platform: 'tiktok',
      handle: '@lanchifoodie',
      url: 'https://www.tiktok.com/@lanchifoodie',
      followerCount: 48_000,
      isVerified: true,
    },
  ],
  audienceMetrics: {
    followerCount: 48_000,
    viewCount: 1_200_000,
    updatedAt: '2026-07-01T08:00:00.000Z',
    isSelfReported: true,
  },
  serviceMode: 'both',
  availability: {
    availableDays: ['mon', 'wed', 'fri'],
    isPaused: false,
  },
  portfolioItems: [
    {
      id: 'pft_0001',
      type: 'video',
      url: 'https://cdn.example.com/video.mp4',
      caption: 'Review quán cà phê mới',
      category: 'food',
      thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
      createdAt: '2026-07-10T08:00:00.000Z',
    },
  ],
  priceFromVnd: 1_500_000,
  rating: 4.8,
  completedBookings: 32,
  createdAt: '2026-05-02T08:00:00.000Z',
} satisfies Creator;

describe('Creator — entity mở rộng (CRE-001..CRE-010)', () => {
  it('chứa đủ các trường cũ và trường mới (không thêm/xóa field)', () => {
    expect(Object.keys(fullCreator).sort()).toEqual([
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
      'userId',
    ]);
  });

  it('availability chứa availableDays + isPaused (CRE-010)', () => {
    expect(fullCreator.availability).toEqual({
      availableDays: ['mon', 'wed', 'fri'],
      isPaused: false,
    });
  });

  it('audienceMetrics đánh dấu isSelfReported = true (CRE-005)', () => {
    expect(fullCreator.audienceMetrics?.isSelfReported).toBe(true);
  });

  it('trường nullable dùng null thay vì undefined (exactOptionalPropertyTypes)', () => {
    const minimal: Creator = {
      id: 'crt_0006',
      userId: null,
      displayName: 'Tân Creator',
      avatarUrl: null,
      bio: 'Mô tả ngắn.',
      city: 'Đà Nẵng',
      niches: [],
      language: 'vi',
      creatorType: 'ugc',
      status: 'draft',
      statusReason: null,
      socialAccounts: [],
      audienceMetrics: null,
      serviceMode: 'both',
      availability: { availableDays: [], isPaused: false },
      portfolioItems: [],
      priceFromVnd: 0,
      rating: 0,
      completedBookings: 0,
      createdAt: '2026-08-04T08:00:00.000Z',
    };
    expect(minimal.userId).toBeNull();
    expect(minimal.statusReason).toBeNull();
  });
});

const ownerDto = {
  id: 'crt_0001',
  displayName: 'Lan Chi Foodie',
  avatarUrl: 'https://cdn.example.com/avatar.jpg',
  bio: 'Food reviewer Hà Nội.',
  city: 'Hà Nội',
  niches: ['f&b', 'cafe'],
  language: 'vi',
  creatorType: 'koc',
  socialAccounts: fullCreator.socialAccounts,
  status: 'verified',
  statusReason: null,
  audienceMetrics: fullCreator.audienceMetrics,
  serviceMode: 'both',
  availability: { availableDays: ['mon'], isPaused: false },
  portfolioItems: fullCreator.portfolioItems,
  priceFromVnd: 1_500_000,
  rating: 4.8,
  completedBookings: 32,
  createdAt: '2026-05-02T08:00:00.000Z',
} satisfies CreatorOwnerDto;

describe('CreatorOwnerDto — DTO cho chính chủ (CRE-001..CRE-010)', () => {
  it('chứa đúng 19 trường owner, không có userId/userEmail (CRE-009)', () => {
    expect(Object.keys(ownerDto).sort()).toEqual([
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
    expect(ownerDto).not.toHaveProperty('userId');
    expect(ownerDto).not.toHaveProperty('userEmail');
  });
});

const adminDto = {
  ...ownerDto,
  userEmail: 'lanchi@example.com',
} satisfies CreatorAdminDto;

describe('CreatorAdminDto — DTO cho admin duyệt hồ sơ (CRE-008)', () => {
  it('kế thừa toàn bộ trường owner và bổ sung userEmail', () => {
    expect(Object.keys(adminDto).sort()).toEqual([...Object.keys(ownerDto).sort(), 'userEmail']);
    expect(adminDto.userEmail).toBe('lanchi@example.com');
  });
});

const profileInput = {
  displayName: 'Lan Chi Foodie',
  bio: 'Food reviewer Hà Nội.',
  city: 'Hà Nội',
  niches: ['f&b', 'cafe'],
  language: 'vi',
  creatorType: 'koc',
  socialAccounts: [
    {
      platform: 'tiktok',
      handle: '@lanchifoodie',
      url: 'https://www.tiktok.com/@lanchifoodie',
      followerCount: 48_000,
      isVerified: true,
    },
  ],
  audienceMetrics: {
    followerCount: 48_000,
    viewCount: 1_200_000,
    updatedAt: '2026-07-01T08:00:00.000Z',
    isSelfReported: true,
  },
  serviceMode: 'both',
} satisfies CreatorProfileInput;

describe('CreatorProfileInput — input cho PUT /creators/me (CRE-001..CRE-006)', () => {
  it('chứa đúng các trường chỉnh hồ sơ (avatarUrl tùy chọn)', () => {
    expect(Object.keys(profileInput).sort()).toEqual([
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
  });

  it('cho phép bỏ trống avatarUrl hoặc gửi null để xóa avatar', () => {
    const noAvatar: CreatorProfileInput = { ...profileInput };
    expect('avatarUrl' in noAvatar).toBe(false);
    const clearAvatar: CreatorProfileInput = { ...profileInput, avatarUrl: null };
    expect(clearAvatar.avatarUrl).toBeNull();
  });
});

const availabilityUpdate = {
  availableDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
  isPaused: false,
} satisfies AvailabilityUpdate;

describe('AvailabilityUpdate — input cho PATCH /creators/me/availability (CRE-010)', () => {
  it('chứa availableDays và isPaused', () => {
    expect(availabilityUpdate).toEqual({
      availableDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
      isPaused: false,
    });
  });
});
