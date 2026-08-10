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
import { getAuthUser, requireAuth, requireVerifiedEmail } from '../auth/auth.middleware.js';
import type { CreatorRepository } from '../creators/creator.repository.js';
import type { NotificationService } from '../notifications/notification.service.js';
import type { PackageRepository } from '../packages/package.repository.js';
import type { UserRepository } from '../users/user.repository.js';
import { BookingService, type BookingActor } from './booking.service.js';
import type { BookingRepository } from './booking.repository.js';
import { BOOKING_ACTIONS, type BookingAction } from './booking.state-machine.js';
import { BOOKING_STATUSES } from './booking.types.js';

const MAX_PAGE_LIMIT = 50;
const DEFAULT_PAGE_LIMIT = 20;

const briefSchema = z.object({
  objective: z.string().trim().min(10, 'Mục tiêu tối thiểu 10 ký tự.').max(500),
  keyMessage: z.string().trim().min(5, 'Key message tối thiểu 5 ký tự.').max(500),
  mustHaveScenes: z.array(z.string().trim().min(3).max(200)).max(10).default([]),
  prohibited: z.array(z.string().trim().min(3).max(200)).max(10).default([]),
  references: z.array(z.string().trim().min(3).max(500)).max(10).default([]),
  desiredDeadline: z.iso.datetime({ message: 'Deadline phải là ISO datetime.' }),
});

const createBookingBodySchema = z.object({
  creatorId: z.string().regex(/^crt_[a-zA-Z0-9]+$/, 'ID creator không hợp lệ.'),
  packageId: z.string().regex(/^pkg_[a-zA-Z0-9]+$/, 'ID package không hợp lệ.'),
  selectedAddOnIds: z
    .array(z.string().regex(/^ado_[a-zA-Z0-9]+$/, 'ID add-on không hợp lệ.'))
    .max(10)
    .default([]),
  brief: briefSchema,
});

type CreateBookingBody = z.infer<typeof createBookingBodySchema>;

const updateBriefBodySchema = z.object({ brief: briefSchema });
type UpdateBriefBody = z.infer<typeof updateBriefBodySchema>;

const bookingIdParamsSchema = z.object({
  id: z.string().regex(/^bkg_[a-zA-Z0-9]+$/, 'ID booking không hợp lệ.'),
});
type BookingIdParams = z.infer<typeof bookingIdParamsSchema>;

/** `expire` không nhận từ HTTP — chỉ scheduler được phép (actor system). */
const CLIENT_ACTIONS = BOOKING_ACTIONS.filter((action) => action !== 'expire');

const transitionBodySchema = z.object({
  action: z.enum(CLIENT_ACTIONS as unknown as [BookingAction, ...BookingAction[]]),
  reason: z.string().trim().min(5, 'Lý do tối thiểu 5 ký tự.').max(500).optional(),
});
type TransitionBody = z.infer<typeof transitionBodySchema>;

const bookingListQuerySchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
});
type BookingListQuery = z.infer<typeof bookingListQuerySchema>;

export interface BookingRouterDeps {
  readonly bookingRepository: BookingRepository;
  readonly packageRepository: PackageRepository;
  readonly creatorRepository: CreatorRepository;
  readonly auditRepository: AuditRepository;
  readonly userRepository: UserRepository;
  readonly notificationService: NotificationService;
}

export const createBookingRouter = (deps: BookingRouterDeps): Router => {
  const service = new BookingService(
    deps.bookingRepository,
    deps.packageRepository,
    deps.creatorRepository,
    deps.auditRepository,
    deps.notificationService,
  );
  const router = Router();

  /**
   * Dựng actor từ access token. Creator cần thêm creatorId hồ sơ để so khớp
   * quyền truy cập booking — nạp một lần ở middleware, dùng lại cho handler.
   */
  const withActor = async (res: Response): Promise<BookingActor> => {
    const authUser = getAuthUser(res);
    if (authUser.role === 'creator') {
      const creator = await deps.creatorRepository.findByUserId(authUser.userId);
      if (!creator) {
        throw ApiError.profileNotFound();
      }
      return { userId: authUser.userId, role: 'creator', creatorId: creator.id };
    }
    return {
      userId: authUser.userId,
      role: authUser.role === 'admin' ? 'admin' : 'brand',
    };
  };

  /** Chỉ brand mới tạo booking — creator/admin không đặt hộ (BKG-001). */
  const requireBrand = (_req: Request, res: Response, next: NextFunction): void => {
    const authUser = getAuthUser(res);
    if (authUser.role !== 'brand') {
      next(ApiError.forbidden('Chỉ tài khoản brand mới tạo được booking.'));
      return;
    }
    next();
  };

  router.post(
    '/',
    requireAuth,
    requireBrand,
    // AUTH-002 + BR-002: chưa xác minh email thì không giao dịch.
    requireVerifiedEmail(deps.userRepository),
    validate({ body: createBookingBodySchema }),
    async (_req: Request, res: Response): Promise<void> => {
      const authUser = getAuthUser(res);
      const body = getValidatedBody<CreateBookingBody>(res);
      const booking = await service.create({
        brandUserId: authUser.userId,
        creatorId: body.creatorId,
        packageId: body.packageId,
        selectedAddOnIds: body.selectedAddOnIds,
        brief: body.brief,
      });
      sendCreated(res, { booking });
    },
  );

  router.get(
    '/',
    requireAuth,
    validate({ query: bookingListQuerySchema }),
    async (_req: Request, res: Response): Promise<void> => {
      const actor = await withActor(res);
      const query = getValidatedQuery<BookingListQuery>(res);
      const result = await service.list(actor, query);
      sendOk(res, result.items, buildPaginationMeta(result.page, result.limit, result.total));
    },
  );

  router.get(
    '/:id',
    requireAuth,
    validate({ params: bookingIdParamsSchema }),
    async (_req: Request, res: Response): Promise<void> => {
      const actor = await withActor(res);
      const params = getValidatedParams<BookingIdParams>(res);
      const booking = await service.getById(actor, params.id);
      sendOk(res, { booking });
    },
  );

  router.put(
    '/:id/brief',
    requireAuth,
    validate({ params: bookingIdParamsSchema, body: updateBriefBodySchema }),
    async (_req: Request, res: Response): Promise<void> => {
      const actor = await withActor(res);
      const params = getValidatedParams<BookingIdParams>(res);
      const body = getValidatedBody<UpdateBriefBody>(res);
      const booking = await service.updateBrief(actor, params.id, body.brief);
      sendOk(res, { booking });
    },
  );

  /** Một endpoint cho mọi chuyển trạng thái — bảng transition quyết định hợp lệ. */
  router.post(
    '/:id/transition',
    requireAuth,
    validate({ params: bookingIdParamsSchema, body: transitionBodySchema }),
    async (_req: Request, res: Response): Promise<void> => {
      const actor = await withActor(res);
      const params = getValidatedParams<BookingIdParams>(res);
      const body = getValidatedBody<TransitionBody>(res);
      const booking = await service.transition(actor, params.id, body.action, body.reason);
      sendOk(res, { booking });
    },
  );

  return router;
};
