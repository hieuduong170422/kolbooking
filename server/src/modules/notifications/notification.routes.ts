import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../../shared/errors/api-error.js';
import { buildPaginationMeta, sendOk } from '../../shared/http/api-response.js';
import {
  getValidatedParams,
  getValidatedQuery,
  validate,
} from '../../shared/middlewares/validate.js';
import { getAuthUser, requireAuth } from '../auth/auth.middleware.js';
import type { NotificationService } from './notification.service.js';

const MAX_PAGE_LIMIT = 50;
const DEFAULT_PAGE_LIMIT = 20;

const listQuerySchema = z.object({
  unreadOnly: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
});
type ListQuery = z.infer<typeof listQuerySchema>;

const idParamsSchema = z.object({
  id: z.string().regex(/^ntf_[a-zA-Z0-9]+$/, 'ID thông báo không hợp lệ.'),
});
type IdParams = z.infer<typeof idParamsSchema>;

/** Thông báo in-app của chính người đăng nhập (NTF-001). */
export const createNotificationRouter = (service: NotificationService): Router => {
  const router = Router();

  router.get(
    '/',
    requireAuth,
    validate({ query: listQuerySchema }),
    async (_req: Request, res: Response): Promise<void> => {
      const authUser = getAuthUser(res);
      const query = getValidatedQuery<ListQuery>(res);
      const result = await service.list(
        authUser.userId,
        query.unreadOnly,
        query.page,
        query.limit,
      );
      sendOk(
        res,
        { items: result.items, unreadCount: result.unreadCount },
        buildPaginationMeta(query.page, query.limit, result.total),
      );
    },
  );

  router.post(
    '/read-all',
    requireAuth,
    async (_req: Request, res: Response): Promise<void> => {
      const authUser = getAuthUser(res);
      const count = await service.markAllRead(authUser.userId);
      sendOk(res, { markedRead: count });
    },
  );

  router.post(
    '/:id/read',
    requireAuth,
    validate({ params: idParamsSchema }),
    async (_req: Request, res: Response): Promise<void> => {
      const authUser = getAuthUser(res);
      const params = getValidatedParams<IdParams>(res);
      const updated = await service.markRead(params.id, authUser.userId);
      if (updated === null) {
        // Không thuộc mình hoặc không tồn tại — cùng một câu trả lời.
        throw ApiError.notFound('Không tìm thấy thông báo này.');
      }
      sendOk(res, { notification: updated });
    },
  );

  return router;
};
