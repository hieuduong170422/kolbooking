import { z } from 'zod';
import { USER_ROLES, USER_STATUSES } from './user.types.js';

const MAX_PAGE_LIMIT = 50;
const DEFAULT_PAGE_LIMIT = 20;

export const userListQuerySchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
});

export type UserListQuery = z.infer<typeof userListQuerySchema>;

export const userIdParamsSchema = z.object({
  id: z.string().regex(/^usr_[a-zA-Z0-9_-]+$/, 'ID người dùng không hợp lệ.'),
});

export type UserIdParams = z.infer<typeof userIdParamsSchema>;

/** BR-014: thao tác nhạy cảm trên tài khoản bắt buộc có lý do. */
export const lockUserBodySchema = z.object({
  reason: z.string().trim().min(5, 'Lý do khóa tối thiểu 5 ký tự.').max(500),
});

export type LockUserBody = z.infer<typeof lockUserBodySchema>;
