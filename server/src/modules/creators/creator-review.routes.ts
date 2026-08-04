import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import type { AuditRepository } from '../audit/audit.repository.js';
import type { UserRepository } from '../users/user.repository.js';
import { validate } from '../../shared/middlewares/validate.js';
import { CreatorReviewController } from './creator-review.controller.js';
import { ReviewService } from './creator-review.service.js';
import type { CreatorRepository } from './creator.repository.js';
import {
  reviewActionSchema,
  reviewParamsSchema,
  reviewQuerySchema,
} from './creator-review.validation.js';

export interface CreatorReviewRouterDeps {
  readonly creatorRepository: CreatorRepository;
  readonly userRepository: UserRepository;
  readonly auditRepository: AuditRepository;
}

/** Composition tại biên module: repository → service → controller → routes. */
export const createCreatorReviewRouter = (deps: CreatorReviewRouterDeps): Router => {
  const controller = new CreatorReviewController(
    new ReviewService(deps.creatorRepository, deps.userRepository, deps.auditRepository),
  );
  const router = Router();

  router.get(
    '/reviews',
    requireAuth,
    requireRole('admin'),
    validate({ query: reviewQuerySchema }),
    controller.listQueue,
  );
  router.post(
    '/:id/review',
    requireAuth,
    requireRole('admin'),
    validate({ params: reviewParamsSchema, body: reviewActionSchema }),
    controller.review,
  );

  return router;
};
