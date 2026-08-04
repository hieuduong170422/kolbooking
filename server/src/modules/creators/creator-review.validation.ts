import { z } from 'zod';
import { CREATOR_STATUSES } from './creator.types.js';

const MAX_PAGE_LIMIT = 50;
const DEFAULT_PAGE_LIMIT = 12;

export const REVIEW_ACTIONS = ['approve', 'reject', 'request_info', 'suspend'] as const;
export type ReviewAction = (typeof REVIEW_ACTIONS)[number];

/** Các action bắt buộc phải có reason (CRE-007: không từ chối/hỏi thêm/suspend mà không lý do). */
const ACTIONS_REQUIRING_REASON: readonly ReviewAction[] = ['reject', 'request_info', 'suspend'];

export const reviewActionSchema = z
  .object({
    action: z.enum(REVIEW_ACTIONS),
    reason: z.string().trim().min(3).max(500).optional(),
  })
  .refine(
    (body) =>
      !ACTIONS_REQUIRING_REASON.includes(body.action) ||
      (body.reason !== undefined && body.reason.length >= 3),
    { message: 'reason bắt buộc khi reject/request_info/suspend.', path: ['reason'] },
  );

export type ReviewActionBody = z.infer<typeof reviewActionSchema>;

export const reviewQuerySchema = z.object({
  status: z.enum(CREATOR_STATUSES).default('pending_review'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
});

export type ReviewQuery = z.infer<typeof reviewQuerySchema>;

export const reviewParamsSchema = z.object({
  id: z.string().regex(/^crt_[a-zA-Z0-9]+$/, 'ID creator không hợp lệ.'),
});

export type ReviewParams = z.infer<typeof reviewParamsSchema>;
