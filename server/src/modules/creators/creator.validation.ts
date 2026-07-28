import { z } from 'zod';
import { CREATOR_SORT_OPTIONS, CREATOR_TYPES, SOCIAL_PLATFORMS } from './creator.types.js';

const MAX_PAGE_LIMIT = 50;
const DEFAULT_PAGE_LIMIT = 12;

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
