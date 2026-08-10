import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../../shared/errors/api-error.js';
import { sendCreated, sendOk } from '../../shared/http/api-response.js';
import {
  getValidatedBody,
  getValidatedParams,
  validate,
} from '../../shared/middlewares/validate.js';
import type { AuditRepository } from '../audit/audit.repository.js';
import { getAuthUser, requireAuth } from '../auth/auth.middleware.js';
import type { BookingParticipant } from '../bookings/booking.access.js';
import type { BookingRepository } from '../bookings/booking.repository.js';
import { BookingService } from '../bookings/booking.service.js';
import type { CreatorRepository } from '../creators/creator.repository.js';
import type { NotificationService } from '../notifications/notification.service.js';
import type { PackageRepository } from '../packages/package.repository.js';
import type { SubmissionRepository } from './submission.repository.js';
import { SubmissionService } from './submission.service.js';

const bookingIdParamsSchema = z.object({
  id: z.string().regex(/^bkg_[a-zA-Z0-9]+$/, 'ID booking không hợp lệ.'),
});
type BookingIdParams = z.infer<typeof bookingIdParamsSchema>;

const submissionItemSchema = z
  .object({
    deliverableIndex: z.number().int().nonnegative().max(20),
    fileUrl: z.url('URL file không hợp lệ.').nullable().default(null),
    linkUrl: z.url('Link không hợp lệ.').nullable().default(null),
    description: z.string().trim().min(3, 'Mô tả tối thiểu 3 ký tự.').max(500),
  })
  .refine((item) => item.fileUrl !== null || item.linkUrl !== null, {
    message: 'Mỗi deliverable cần file hoặc link.',
    path: ['fileUrl'],
  });

const submitBodySchema = z.object({
  note: z.string().trim().max(1000).default(''),
  items: z.array(submissionItemSchema).min(1, 'Cần nộp ít nhất một deliverable.').max(20),
  postingProofs: z
    .array(
      z.object({
        platform: z.string().trim().min(2).max(30),
        url: z.url('Link bài đăng không hợp lệ.'),
      }),
    )
    .max(10)
    .default([]),
});
type SubmitBody = z.infer<typeof submitBodySchema>;

const revisionBodySchema = z.object({
  reason: z.string().trim().min(10, 'Mô tả yêu cầu sửa tối thiểu 10 ký tự.').max(1000),
});
type RevisionBody = z.infer<typeof revisionBodySchema>;

export interface SubmissionRouterDeps {
  readonly submissionRepository: SubmissionRepository;
  readonly bookingRepository: BookingRepository;
  readonly packageRepository: PackageRepository;
  readonly creatorRepository: CreatorRepository;
  readonly auditRepository: AuditRepository;
  readonly notificationService: NotificationService;
}

/** Nộp bài / yêu cầu sửa — gắn dưới /bookings/:id (DLV-001..DLV-006). */
export const createSubmissionRouter = (deps: SubmissionRouterDeps): Router => {
  const bookingService = new BookingService(
    deps.bookingRepository,
    deps.packageRepository,
    deps.creatorRepository,
    deps.auditRepository,
    deps.notificationService,
  );
  const service = new SubmissionService(
    deps.submissionRepository,
    deps.bookingRepository,
    bookingService,
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
    '/:id/submissions',
    requireAuth,
    validate({ params: bookingIdParamsSchema }),
    async (_req: Request, res: Response): Promise<void> => {
      const actor = await withActor(res);
      const params = getValidatedParams<BookingIdParams>(res);
      const state = await service.getState(actor, params.id);
      sendOk(res, state);
    },
  );

  router.post(
    '/:id/submissions',
    requireAuth,
    validate({ params: bookingIdParamsSchema, body: submitBodySchema }),
    async (_req: Request, res: Response): Promise<void> => {
      const actor = await withActor(res);
      const params = getValidatedParams<BookingIdParams>(res);
      const body = getValidatedBody<SubmitBody>(res);
      const submission = await service.submit(actor, params.id, body);
      sendCreated(res, { submission });
    },
  );

  router.post(
    '/:id/revisions',
    requireAuth,
    validate({ params: bookingIdParamsSchema, body: revisionBodySchema }),
    async (_req: Request, res: Response): Promise<void> => {
      const actor = await withActor(res);
      const params = getValidatedParams<BookingIdParams>(res);
      const body = getValidatedBody<RevisionBody>(res);
      const revision = await service.requestRevision(actor, params.id, body.reason);
      sendCreated(res, { revision });
    },
  );

  return router;
};
