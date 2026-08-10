import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../../shared/errors/api-error.js';
import { buildPaginationMeta, sendCreated, sendOk } from '../../shared/http/api-response.js';
import {
  getValidatedBody,
  getValidatedParams,
  getValidatedQuery,
  validate,
} from '../../shared/middlewares/validate.js';
import type { AuditRepository } from '../audit/audit.repository.js';
import { getAuthUser, requireAuth } from '../auth/auth.middleware.js';
import type { BookingParticipant } from '../bookings/booking.access.js';
import type { BookingRepository } from '../bookings/booking.repository.js';
import type { CreatorRepository } from '../creators/creator.repository.js';
import type { NotificationService } from '../notifications/notification.service.js';
import type { MessageRepository } from './message.repository.js';
import { MessageService } from './message.service.js';

const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 50;

const bookingIdParamsSchema = z.object({
  id: z.string().regex(/^bkg_[a-zA-Z0-9]+$/, 'ID booking không hợp lệ.'),
});
type BookingIdParams = z.infer<typeof bookingIdParamsSchema>;

const messageIdParamsSchema = z.object({
  messageId: z.string().regex(/^msg_[a-zA-Z0-9]+$/, 'ID tin nhắn không hợp lệ.'),
});
type MessageIdParams = z.infer<typeof messageIdParamsSchema>;

const sendMessageBodySchema = z.object({
  body: z.string().trim().min(1, 'Nội dung không được để trống.').max(2000),
  fileUrl: z.url('URL file không hợp lệ.').nullable().optional(),
  fileName: z.string().trim().min(1).max(200).nullable().optional(),
});
type SendMessageBody = z.infer<typeof sendMessageBodySchema>;

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
});
type ListQuery = z.infer<typeof listQuerySchema>;

export interface MessageRouterDeps {
  readonly messageRepository: MessageRepository;
  readonly bookingRepository: BookingRepository;
  readonly creatorRepository: CreatorRepository;
  readonly notificationService: NotificationService;
  readonly auditRepository: AuditRepository;
}

/** Chat gắn với booking: mount dưới /bookings/:id/messages (CHAT-001). */
export const createMessageRouter = (deps: MessageRouterDeps): Router => {
  const service = new MessageService(
    deps.messageRepository,
    deps.bookingRepository,
    deps.notificationService,
    deps.auditRepository,
  );
  const router = Router();

  const withActor = async (res: Response): Promise<BookingParticipant> => {
    const authUser = getAuthUser(res);
    if (authUser.role === 'creator') {
      const creator = await deps.creatorRepository.findByUserId(authUser.userId);
      if (!creator) {
        throw ApiError.profileNotFound();
      }
      return { userId: authUser.userId, role: 'creator', creatorId: creator.id };
    }
    return { userId: authUser.userId, role: authUser.role === 'admin' ? 'admin' : 'brand' };
  };

  router.get(
    '/:id/messages',
    requireAuth,
    validate({ params: bookingIdParamsSchema, query: listQuerySchema }),
    async (_req: Request, res: Response): Promise<void> => {
      const actor = await withActor(res);
      const params = getValidatedParams<BookingIdParams>(res);
      const query = getValidatedQuery<ListQuery>(res);
      const result = await service.list(actor, params.id, query.page, query.limit);
      sendOk(res, result.items, buildPaginationMeta(result.page, result.limit, result.total));
    },
  );

  router.post(
    '/:id/messages',
    requireAuth,
    validate({ params: bookingIdParamsSchema, body: sendMessageBodySchema }),
    async (_req: Request, res: Response): Promise<void> => {
      const actor = await withActor(res);
      const params = getValidatedParams<BookingIdParams>(res);
      const body = getValidatedBody<SendMessageBody>(res);
      const message = await service.send(actor, params.id, body);
      sendCreated(res, { message });
    },
  );

  router.post(
    '/:id/messages/read',
    requireAuth,
    validate({ params: bookingIdParamsSchema }),
    async (_req: Request, res: Response): Promise<void> => {
      const actor = await withActor(res);
      const params = getValidatedParams<BookingIdParams>(res);
      const updated = await service.markRead(actor, params.id);
      sendOk(res, { markedRead: updated });
    },
  );

  router.delete(
    '/:id/messages/:messageId',
    requireAuth,
    validate({ params: bookingIdParamsSchema.merge(messageIdParamsSchema) }),
    async (_req: Request, res: Response): Promise<void> => {
      const actor = await withActor(res);
      const params = getValidatedParams<BookingIdParams & MessageIdParams>(res);
      const message = await service.remove(actor, params.messageId);
      sendOk(res, { message });
    },
  );

  return router;
};
