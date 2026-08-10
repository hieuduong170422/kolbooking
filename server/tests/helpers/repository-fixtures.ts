import type { Booking, BookingTotals } from '../../src/modules/bookings/booking.types.js';
import type { Brand } from '../../src/modules/brands/brand.types.js';
import type { Creator } from '../../src/modules/creators/creator.types.js';
import type { ServicePackage } from '../../src/modules/packages/package.types.js';

/**
 * Fixture tối thiểu nhưng ĐẦY ĐỦ trường của entity — repository lưu nguyên bản
 * nên thiếu trường sẽ không lộ ra ở test in-memory mà chỉ vỡ khi chạy thật.
 */
export const makeCreator = (overrides: Partial<Creator> = {}): Creator => ({
  id: 'crt_fixture',
  userId: null,
  displayName: 'Lan Chi Foodie',
  avatarUrl: null,
  bio: 'Chuyên review quán ăn Sài Gòn',
  city: 'Hồ Chí Minh',
  niches: ['food', 'lifestyle'],
  language: 'vi',
  creatorType: 'koc',
  status: 'verified',
  statusReason: null,
  socialAccounts: [
    {
      platform: 'tiktok',
      handle: '@lanchi',
      url: 'https://tiktok.com/@lanchi',
      followerCount: 120_000,
      isVerified: false,
    },
  ],
  audienceMetrics: {
    followerCount: 120_000,
    viewCount: 2_000_000,
    updatedAt: '2026-07-01T08:00:00.000Z',
    isSelfReported: true,
  },
  serviceMode: 'both',
  availability: { availableDays: ['mon', 'tue'], isPaused: false },
  portfolioItems: [],
  priceFromVnd: 2_000_000,
  rating: 4.5,
  completedBookings: 12,
  createdAt: '2026-07-01T08:00:00.000Z',
  ...overrides,
});

export const makePackage = (overrides: Partial<ServicePackage> = {}): ServicePackage => ({
  id: 'pkg_fixture',
  creatorId: 'crt_fixture',
  name: 'Video review 60s',
  category: 'food',
  platforms: ['tiktok'],
  description: 'Một video review chuẩn TikTok',
  coverImageUrl: null,
  deliverables: [
    { type: 'video', quantity: 1, description: 'video 60s dọc', postedOnCreatorChannel: true },
  ],
  priceVnd: 3_000_000,
  turnaroundDays: 5,
  revisionsIncluded: 1,
  usageRights: { repost: true, paidAds: false, durationMonths: 3, channels: ['tiktok'] },
  postDurationDays: 30,
  addOns: [{ id: 'ado_1', type: 'fast_delivery', label: 'Giao nhanh 48h', priceVnd: 300_000 }],
  status: 'published',
  statusReason: null,
  version: 1,
  createdAt: '2026-07-01T08:00:00.000Z',
  updatedAt: '2026-07-01T08:00:00.000Z',
  ...overrides,
});

export const makeBrand = (overrides: Partial<Brand> = {}): Brand => ({
  id: 'brd_fixture',
  userId: 'usr_brand',
  name: 'Trà sữa ABC',
  logoUrl: null,
  industry: 'F&B',
  website: null,
  socialLinks: ['https://facebook.com/abc'],
  businessAddress: '12 Nguyễn Huệ, Quận 1',
  entityType: 'company',
  status: 'pending_review',
  statusReason: null,
  verificationDocs: [],
  contact: { name: 'Chị Mai', email: 'mai@abc.vn', phone: '0900000000' },
  createdAt: '2026-07-01T08:00:00.000Z',
  ...overrides,
});

const TOTALS: BookingTotals = {
  packagePriceVnd: 3_000_000,
  addOnsTotalVnd: 300_000,
  platformFeeVnd: 396_000,
  totalVnd: 3_696_000,
  creatorEarningsVnd: 3_300_000,
};

export const makeBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'bkg_fixture',
  code: 'KB-260801-0001',
  brandUserId: 'usr_brand',
  creatorId: 'crt_fixture',
  creatorUserId: 'usr_creator',
  packageId: 'pkg_fixture',
  status: 'pending_creator',
  brief: {
    objective: 'Tăng nhận diện món mới',
    keyMessage: 'Trà sữa ít đường',
    mustHaveScenes: ['cận ly trà sữa'],
    prohibited: ['so sánh đối thủ'],
    references: [],
    desiredDeadline: '2026-08-20',
    version: 1,
  },
  selectedAddOnIds: ['ado_1'],
  totals: TOTALS,
  snapshot: null,
  statusReason: null,
  expiresAt: '2026-08-15T08:00:00.000Z',
  timeline: [
    {
      at: '2026-08-01T08:00:00.000Z',
      actorUserId: 'usr_brand',
      action: 'booking.create',
      fromStatus: null,
      toStatus: 'pending_creator',
      note: null,
    },
  ],
  createdAt: '2026-08-01T08:00:00.000Z',
  updatedAt: '2026-08-01T08:00:00.000Z',
  ...overrides,
});
