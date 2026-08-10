import { z } from 'zod';
import { SOCIAL_PLATFORMS } from '../creators/creator.types.js';
import { ADD_ON_TYPES, DELIVERABLE_TYPES } from './package.types.js';

const MAX_PAGE_LIMIT = 50;
const DEFAULT_PAGE_LIMIT = 12;

/** Giới hạn nghiệp vụ — tránh dữ liệu rác, không hardcode rải rác (PKG-003). */
const MIN_PRICE_VND = 50_000;
const MAX_PRICE_VND = 500_000_000;
const MAX_TURNAROUND_DAYS = 60;
const MAX_REVISIONS = 10;
const MAX_DELIVERABLES = 10;
const MAX_ADD_ONS = 10;

const deliverableSchema = z.object({
  type: z.enum(DELIVERABLE_TYPES),
  quantity: z.number().int().positive().max(50),
  description: z.string().trim().min(3, 'Mô tả deliverable tối thiểu 3 ký tự.').max(200),
  postedOnCreatorChannel: z.boolean(),
});

const usageRightsSchema = z.object({
  repost: z.boolean(),
  paidAds: z.boolean(),
  durationMonths: z.number().int().positive().max(120).nullable(),
  channels: z.array(z.string().trim().min(2).max(30)).max(10),
});

const addOnSchema = z.object({
  type: z.enum(ADD_ON_TYPES),
  label: z.string().trim().min(2, 'Tên add-on tối thiểu 2 ký tự.').max(100),
  priceVnd: z.number().int().positive().max(MAX_PRICE_VND),
});

export const packageBodySchema = z.object({
  name: z.string().trim().min(5, 'Tên package tối thiểu 5 ký tự.').max(100),
  category: z.string().trim().min(2, 'Category tối thiểu 2 ký tự.').max(50),
  platforms: z
    .array(z.enum(SOCIAL_PLATFORMS))
    .min(1, 'Chọn ít nhất một nền tảng.')
    .max(SOCIAL_PLATFORMS.length),
  description: z.string().trim().min(20, 'Mô tả tối thiểu 20 ký tự.').max(2000),
  coverImageUrl: z.url('URL ảnh cover không hợp lệ.').nullable().optional(),
  deliverables: z
    .array(deliverableSchema)
    .min(1, 'Package cần ít nhất một deliverable.')
    .max(MAX_DELIVERABLES),
  priceVnd: z
    .number()
    .int('Giá phải là số nguyên VND.')
    .min(MIN_PRICE_VND, `Giá tối thiểu ${MIN_PRICE_VND.toLocaleString('vi-VN')} VND.`)
    .max(MAX_PRICE_VND),
  turnaroundDays: z.number().int().positive().max(MAX_TURNAROUND_DAYS),
  revisionsIncluded: z.number().int().nonnegative().max(MAX_REVISIONS),
  usageRights: usageRightsSchema,
  postDurationDays: z.number().int().positive().max(365).nullable().optional(),
  addOns: z.array(addOnSchema).max(MAX_ADD_ONS).default([]),
});

export type PackageBody = z.infer<typeof packageBodySchema>;

export const packageIdParamsSchema = z.object({
  id: z.string().regex(/^pkg_[a-zA-Z0-9]+$/, 'ID package không hợp lệ.'),
});

export type PackageIdParams = z.infer<typeof packageIdParamsSchema>;

export const packageListQuerySchema = z.object({
  creatorId: z.string().regex(/^crt_[a-zA-Z0-9]+$/, 'ID creator không hợp lệ.'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
});

export type PackageListQuery = z.infer<typeof packageListQuerySchema>;

export const packageHideBodySchema = z.object({
  reason: z.string().trim().min(5, 'Lý do ẩn tối thiểu 5 ký tự.').max(500),
});

export type PackageHideBody = z.infer<typeof packageHideBodySchema>;
