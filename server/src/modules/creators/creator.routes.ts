import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.js';
import { requireAuth, requireRole, requireVerifiedEmail } from '../auth/auth.middleware.js';
import type { AuditRepository } from '../audit/audit.repository.js';
import type { UserRepository } from '../users/user.repository.js';
import { CreatorController } from './creator.controller.js';
import type { CreatorRepository } from './creator.repository.js';
import { CreatorService } from './creator.service.js';
import {
  availabilitySchema,
  creatorIdParamsSchema,
  creatorListQuerySchema,
  creatorProfileBodySchema,
} from './creator.validation.js';

export interface CreatorRouterDeps {
  readonly creatorRepository: CreatorRepository;
  readonly auditRepository: AuditRepository;
  readonly userRepository: UserRepository;
}

/** Composition tại biên module: repository → service → controller → routes. */
export const createCreatorRouter = (deps: CreatorRouterDeps): Router => {
  const controller = new CreatorController(
    new CreatorService(deps.creatorRepository, deps.auditRepository),
  );
  const router = Router();

  router.get('/', validate({ query: creatorListQuerySchema }), controller.list);

  // Các route /me PHẢI đăng ký TRƯỚC /:id — nếu không "me" sẽ khớp :id
  // và trượt regex creatorIdParamsSchema → 400 thay vì vào handler owner.
  router.get('/me', requireAuth, requireRole('creator'), controller.getMe);
  router.put(
    '/me',
    requireAuth,
    requireRole('creator'),
    validate({ body: creatorProfileBodySchema }),
    controller.updateMe,
  );
  // AUTH-002: chưa xác minh email thì không được submit hồ sơ đi duyệt.
  router.post(
    '/me/submit-review',
    requireAuth,
    requireRole('creator'),
    requireVerifiedEmail(deps.userRepository),
    controller.submitForReview,
  );
  router.patch(
    '/me/availability',
    requireAuth,
    requireRole('creator'),
    validate({ body: availabilitySchema }),
    controller.updateAvailability,
  );

  router.get('/:id', validate({ params: creatorIdParamsSchema }), controller.getById);

  return router;
};
