import { z } from 'zod';
import {
  CREATOR_DAYS_OF_WEEK,
  CREATOR_LANGUAGES,
  CREATOR_SORT_OPTIONS,
  CREATOR_TYPES,
  SERVICE_MODES,
  SOCIAL_PLATFORMS,
  type SocialPlatform,
} from './creator.types.js';

const MAX_PAGE_LIMIT = 50;
const DEFAULT_PAGE_LIMIT = 12;

/** Host hợp lệ cho từng nền tảng xã hội — chống URL giả mạo (CRE-002). */
const SOCIAL_PLATFORM_HOSTS: Readonly<Record<SocialPlatform, string>> = {
  tiktok: 'tiktok.com',
  instagram: 'instagram.com',
  youtube: 'youtube.com',
  facebook: 'facebook.com',
};

export const creatorListQuerySchema = z
  .object({
    search: z.string().trim().min(1).max(100).optional(),
    city: z.string().trim().min(1).max(100).optional(),
    creatorType: z.enum(CREATOR_TYPES).optional(),
    platform: z.enum(SOCIAL_PLATFORMS).optional(),
    minPrice: z.coerce.number().int().nonnegative().optional(),
    maxPrice: z.coerce.number().int().nonnegative().optional(),
    sort: z.enum(CREATOR_SORT_OPTIONS).default('rating'),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
  })
  .refine(
    (query) =>
      query.minPrice === undefined ||
      query.maxPrice === undefined ||
      query.minPrice <= query.maxPrice,
    { message: 'minPrice phải nhỏ hơn hoặc bằng maxPrice.', path: ['minPrice'] },
  );

export type CreatorListQuery = z.infer<typeof creatorListQuerySchema>;

export const creatorIdParamsSchema = z.object({
  id: z
    .string()
    .regex(/^crt_[a-zA-Z0-9]+$/, 'ID creator không hợp lệ.'),
});

export type CreatorIdParams = z.infer<typeof creatorIdParamsSchema>;

const socialAccountSchema = z
  .object({
    platform: z.enum(SOCIAL_PLATFORMS),
    handle: z.string().trim().min(1).max(50),
    url: z.url('URL không hợp lệ.'),
    followerCount: z.number().int().nonnegative(),
    // Creator KHÔNG được tự đánh dấu xác minh — chỉ admin/seed set true (CRE-002).
    isVerified: z.literal(false),
  })
  .refine(
    (account) => {
      const expectedHost = SOCIAL_PLATFORM_HOSTS[account.platform];
      if (!expectedHost) return false;
      try {
        const host = new URL(account.url).hostname;
        return host === expectedHost || host.endsWith(`.${expectedHost}`);
      } catch {
        return false;
      }
    },
    { message: 'URL phải khớp nền tảng xã hội đã chọn.', path: ['url'] },
  );

/** Body cho PUT /creators/me — full replace hồ sơ (CRE-001..006). */
export const creatorProfileBodySchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  avatarUrl: z.url('URL không hợp lệ.').nullable().optional(),
  bio: z.string().trim().min(10).max(500),
  city: z.string().trim().min(2).max(60),
  niches: z.array(z.string().trim().min(2).max(30)).min(1).max(5),
  language: z.enum(CREATOR_LANGUAGES),
  creatorType: z.enum(CREATOR_TYPES),
  socialAccounts: z.array(socialAccountSchema).max(4),
  audienceMetrics: z
    .object({
      followerCount: z.number().int().nonnegative(),
      viewCount: z.number().int().nonnegative(),
      updatedAt: z.string().datetime(),
      // Số liệu luôn tự khai báo — chưa có cơ chế xác minh (CRE-005).
      isSelfReported: z.literal(true),
    })
    .nullable(),
  serviceMode: z.enum(SERVICE_MODES),
});

export type CreatorProfileBody = z.infer<typeof creatorProfileBodySchema>;

/** Body cho PATCH /creators/me/availability — lịch nhận việc (CRE-010). */
export const availabilitySchema = z.object({
  availableDays: z
    .array(z.enum(CREATOR_DAYS_OF_WEEK))
    .max(7)
    .refine((days) => new Set(days).size === days.length, {
      message: 'availableDays không được trùng ngày.',
      path: ['availableDays'],
    }),
  isPaused: z.boolean(),
});

export type AvailabilityBody = z.infer<typeof availabilitySchema>;
