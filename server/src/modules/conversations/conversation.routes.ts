import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
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
import type { BookingRepository } from '../bookings/booking.repository.js';
import type { CreatorRepository } from '../creators/creator.repository.js';
import { MessageService } from '../messages/message.service.js';
import type { MessageRepository } from '../messages/message.repository.js';
import type { NotificationService } from '../notifications/notification.service.js';
import type { UserRepository } from '../users/user.repository.js';
import type { ConversationRepository } from './conversation.repository.js';
import { ConversationService, type ChatActor } from './conversation.service.js';

const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 50;

const startBodySchema = z.object({
  creatorId: z.string().regex(/^crt_[a-zA-Z0-9]+$/, 'ID creator không hợp lệ.'),
});
type StartBody = z.infer<typeof startBodySchema>;

const idParamsSchema = z.object({
  id: z.string().regex(/^cnv_[a-zA-Z0-9]+$/, 'ID cuộc trò chuyện không hợp lệ.'),
});
type IdParams = z.infer<typeof idParamsSchema>;

const messageIdParamsSchema = idParamsSchema.extend({
  messageId: z.string().regex(/^msg_[a-zA-Z0-9]+$/, 'ID tin nhắn không hợp lệ.'),
});
type MessageIdParams = z.infer<typeof messageIdParamsSchema>;

const sendBodySchema = z.object({
  body: z.string().trim().min(1, 'Nội dung không được để trống.').max(2000),
  fileUrl: z.url('URL file không hợp lệ.').nullable().optional(),
  fileName: z.string().trim().min(1).max(200).nullable().optional(),
  bookingId: z
    .string()
    .regex(/^bkg_[a-zA-Z0-9]+$/, 'ID booking không hợp lệ.')
    .nullable()
    .optional(),
});
type SendBody = z.infer<typeof sendBodySchema>;

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
});
type ListQuery = z.infer<typeof listQuerySchema>;

export interface ConversationRouterDeps {
  readonly conversationRepository: ConversationRepository;
  readonly messageRepository: MessageRepository;
  readonly bookingRepository: BookingRepository;
  readonly creatorRepository: CreatorRepository;
  readonly userRepository: UserRepository;
  readonly notificationService: NotificationService;
  readonly auditRepository: AuditRepository;
}

/** Chat độc lập với booking — brand hỏi trước rồi mới đặt (OD-09). */
export const createConversationRouter = (deps: ConversationRouterDeps): Router => {
  const conversationService = new ConversationService(
    deps.conversationRepository,
    deps.creatorRepository,
    deps.userRepository,
    deps.messageRepository,
  );
  const messageService = new MessageService(
    deps.messageRepository,
    conversationService,
    deps.bookingRepository,
    deps.notificationService,
    deps.auditRepository,
  );
  const router = Router();

  const withActor = async (res: Response): Promise<ChatActor> => {
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

  /** Chỉ brand mở luồng mới — chặn creator nhắn chào mời hàng loạt. */
  const requireBrand = (_req: Request, res: Response, next: NextFunction): void => {
    if (getAuthUser(res).role !== 'brand') {
      next(ApiError.forbidden('Chỉ tài khoản brand mới bắt đầu được cuộc trò chuyện.'));
      return;
    }
    next();
  };

  router.get('/', requireAuth, async (_req: Request, res: Response): Promise<void> => {
    const actor = await withActor(res);
    const items = await conversationService.listForActor(actor);
    sendOk(res, items);
  });

  router.post(
    '/',
    requireAuth,
    requireBrand,
    validate({ body: startBodySchema }),
    async (_req: Request, res: Response): Promise<void> => {
      const authUser = getAuthUser(res);
      const body = getValidatedBody<StartBody>(res);
      const conversation = await conversationService.getOrCreateForPair(
        authUser.userId,
        body.creatorId,
      );
      sendCreated(res, { conversation });
    },
  );

  router.get(
    '/:id/messages',
    requireAuth,
    validate({ params: idParamsSchema, query: listQuerySchema }),
    async (_req: Request, res: Response): Promise<void> => {
      const actor = await withActor(res);
      const params = getValidatedParams<IdParams>(res);
      const query = getValidatedQuery<ListQuery>(res);
      const result = await messageService.list(actor, params.id, query.page, query.limit);
      sendOk(res, result.items, buildPaginationMeta(result.page, result.limit, result.total));
    },
  );

  router.post(
    '/:id/messages',
    requireAuth,
    validate({ params: idParamsSchema, body: sendBodySchema }),
    async (_req: Request, res: Response): Promise<void> => {
      const actor = await withActor(res);
      const params = getValidatedParams<IdParams>(res);
      const body = getValidatedBody<SendBody>(res);
      const message = await messageService.send(actor, params.id, body);
      sendCreated(res, { message });
    },
  );

  router.post(
    '/:id/messages/read',
    requireAuth,
    validate({ params: idParamsSchema }),
    async (_req: Request, res: Response): Promise<void> => {
      const actor = await withActor(res);
      const params = getValidatedParams<IdParams>(res);
      const markedRead = await messageService.markRead(actor, params.id);
      sendOk(res, { markedRead });
    },
  );

  router.delete(
    '/:id/messages/:messageId',
    requireAuth,
    validate({ params: messageIdParamsSchema }),
    async (_req: Request, res: Response): Promise<void> => {
      const actor = await withActor(res);
      const params = getValidatedParams<MessageIdParams>(res);
      const message = await messageService.remove(actor, params.messageId);
      sendOk(res, { message });
    },
  );

  /**
   * Tra luồng của một booking — client mở booking rồi lấy đúng luồng của
   * cặp brand-creator đó, nên lịch sử hỏi trước booking hiện luôn tại chỗ.
   */
  router.get(
    '/for-booking/:bookingId',
    requireAuth,
    validate({
      params: z.object({
        bookingId: z.string().regex(/^bkg_[a-zA-Z0-9]+$/, 'ID booking không hợp lệ.'),
      }),
    }),
    async (_req: Request, res: Response): Promise<void> => {
      const actor = await withActor(res);
      const params = getValidatedParams<{ bookingId: string }>(res);
      const booking = await deps.bookingRepository.findById(params.bookingId);
      if (!booking) {
        throw ApiError.notFound('Không tìm thấy booking này.');
      }

      const isParticipant =
        actor.role === 'admin' ||
        booking.brandUserId === actor.userId ||
        (actor.creatorId !== undefined && booking.creatorId === actor.creatorId);
      if (!isParticipant) {
        throw ApiError.notFound('Không tìm thấy booking này.');
      }

      const conversation = await conversationService.getOrCreateForPair(
        booking.brandUserId,
        booking.creatorId,
      );
      sendOk(res, { conversation });
    },
  );

  return router;
};
