import { z } from 'zod';
import { BRAND_ENTITY_TYPES, BRAND_STATUSES } from './brand.types.js';

const MAX_PAGE_LIMIT = 50;
const DEFAULT_PAGE_LIMIT = 12;
const MAX_SOCIAL_LINKS = 5;

/** SĐT Việt Nam: 0xxxxxxxxx hoặc +84xxxxxxxxx (BRD-005). */
const PHONE_PATTERN = /^(0|\+84)\d{8,10}$/;

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Tên người liên hệ tối thiểu 2 ký tự.').max(50),
  email: z.email('Email liên hệ không hợp lệ.').max(254),
  phone: z.string().regex(PHONE_PATTERN, 'Số điện thoại không hợp lệ (0xxxxxxxxx hoặc +84...).'),
});

export const brandProfileBodySchema = z.object({
  name: z.string().trim().min(2, 'Tên brand tối thiểu 2 ký tự.').max(100),
  logoUrl: z.url('URL logo không hợp lệ.').nullable().optional(),
  industry: z.string().trim().min(2, 'Ngành hàng tối thiểu 2 ký tự.').max(50),
  website: z.url('URL website không hợp lệ.').nullable().optional(),
  socialLinks: z.array(z.url('URL mạng xã hội không hợp lệ.')).max(MAX_SOCIAL_LINKS).default([]),
  businessAddress: z.string().trim().min(5, 'Địa chỉ kinh doanh tối thiểu 5 ký tự.').max(200),
  entityType: z.enum(BRAND_ENTITY_TYPES, 'Loại chủ thể phải là individual/household/company.'),
  contact: contactSchema,
});

export type BrandProfileBody = z.infer<typeof brandProfileBodySchema>;

export const brandIdParamsSchema = z.object({
  id: z.string().regex(/^brd_[a-zA-Z0-9]+$/, 'ID brand không hợp lệ.'),
});

export type BrandIdParams = z.infer<typeof brandIdParamsSchema>;

export const brandDocParamsSchema = z.object({
  id: z.string().regex(/^brd_[a-zA-Z0-9]+$/, 'ID brand không hợp lệ.'),
  docId: z.string().regex(/^doc_[a-zA-Z0-9]+$/, 'ID tài liệu không hợp lệ.'),
});

export type BrandDocParams = z.infer<typeof brandDocParamsSchema>;

export const BRAND_REVIEW_ACTIONS = ['approve', 'reject', 'request_info', 'suspend'] as const;
export type BrandReviewAction = (typeof BRAND_REVIEW_ACTIONS)[number];

export const brandReviewBodySchema = z.object({
  action: z.enum(BRAND_REVIEW_ACTIONS, 'Action phải là approve/reject/request_info/suspend.'),
  reason: z.string().trim().min(5, 'Lý do tối thiểu 5 ký tự.').max(500).optional(),
});

export type BrandReviewBody = z.infer<typeof brandReviewBodySchema>;

export const brandReviewQueueQuerySchema = z.object({
  status: z.enum(BRAND_STATUSES).default('pending_review'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
});

export type BrandReviewQueueQuery = z.infer<typeof brandReviewQueueQuerySchema>;
