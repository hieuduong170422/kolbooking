import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.js';
import type { AuditRepository } from '../audit/audit.repository.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import type { SessionRepository } from '../auth/session.repository.js';
import { UserAdminController } from './user.controller.js';
import type { UserRepository } from './user.repository.js';
import { UserAdminService } from './user.service.js';
import {
  lockUserBodySchema,
  userIdParamsSchema,
  userListQuerySchema,
} from './user.validation.js';

export interface UserRouterDeps {
  readonly userRepository: UserRepository;
  readonly sessionRepository: SessionRepository;
  readonly auditRepository: AuditRepository;
}

/** Toàn bộ route quản lý tài khoản chỉ dành cho admin (ADM-002, ADM-004). */
export const createUserRouter = (deps: UserRouterDeps): Router => {
  const controller = new UserAdminController(
    new UserAdminService(deps.userRepository, deps.sessionRepository, deps.auditRepository),
  );
  const router = Router();

  router.get(
    '/',
    requireAuth,
    requireRole('admin'),
    validate({ query: userListQuerySchema }),
    controller.list,
  );
  router.post(
    '/:id/lock',
    requireAuth,
    requireRole('admin'),
    validate({ params: userIdParamsSchema, body: lockUserBodySchema }),
    controller.lock,
  );
  router.post(
    '/:id/unlock',
    requireAuth,
    requireRole('admin'),
    validate({ params: userIdParamsSchema }),
    controller.unlock,
  );

  return router;
};
