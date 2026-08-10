import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.js';
import type { AuditRepository } from '../audit/audit.repository.js';
import {
  requireAuth,
  requireRole,
  requireVerifiedEmail,
} from '../auth/auth.middleware.js';
import type { CreatorRepository } from '../creators/creator.repository.js';
import type { UserRepository } from '../users/user.repository.js';
import { PackageController } from './package.controller.js';
import type { PackageRepository } from './package.repository.js';
import { PackageService } from './package.service.js';
import {
  packageAdminQuerySchema,
  packageBodySchema,
  packageHideBodySchema,
  packageIdParamsSchema,
  packageListQuerySchema,
} from './package.validation.js';

export interface PackageRouterDeps {
  readonly packageRepository: PackageRepository;
  readonly creatorRepository: CreatorRepository;
  readonly auditRepository: AuditRepository;
  readonly userRepository: UserRepository;
}

/** Composition tại biên module: repository → service → controller → routes. */
export const createPackageRouter = (deps: PackageRouterDeps): Router => {
  const controller = new PackageController(
    new PackageService(deps.packageRepository, deps.creatorRepository, deps.auditRepository),
  );
  const router = Router();

  // Public — danh sách/chi tiết package published (PKG-001, SRCH-005).
  router.get('/', validate({ query: packageListQuerySchema }), controller.listPublic);

  // Moderation admin — /admin PHẢI đứng trước /:id (route ordering).
  router.get(
    '/admin',
    requireAuth,
    requireRole('admin'),
    validate({ query: packageAdminQuerySchema }),
    controller.listForAdmin,
  );

  // Owner (creator) — /me PHẢI đứng trước /:id (route ordering).
  router.get('/me', requireAuth, requireRole('creator'), controller.listMine);
  router.post(
    '/',
    requireAuth,
    requireRole('creator'),
    validate({ body: packageBodySchema }),
    controller.create,
  );
  router.put(
    '/:id',
    requireAuth,
    requireRole('creator'),
    validate({ params: packageIdParamsSchema, body: packageBodySchema }),
    controller.update,
  );
  // AUTH-002: chưa xác minh email thì không publish (gate giao dịch).
  router.post(
    '/:id/publish',
    requireAuth,
    requireRole('creator'),
    requireVerifiedEmail(deps.userRepository),
    validate({ params: packageIdParamsSchema }),
    controller.publish,
  );
  router.post(
    '/:id/unpublish',
    requireAuth,
    requireRole('creator'),
    validate({ params: packageIdParamsSchema }),
    controller.unpublish,
  );
  router.delete(
    '/:id',
    requireAuth,
    requireRole('creator'),
    validate({ params: packageIdParamsSchema }),
    controller.deleteDraft,
  );

  // Admin moderation (PKG-010, ADM-010).
  router.post(
    '/:id/hide',
    requireAuth,
    requireRole('admin'),
    validate({ params: packageIdParamsSchema, body: packageHideBodySchema }),
    controller.hide,
  );
  router.post(
    '/:id/unhide',
    requireAuth,
    requireRole('admin'),
    validate({ params: packageIdParamsSchema }),
    controller.unhide,
  );

  // Public detail — sau các route tĩnh để không nuốt /me.
  router.get('/:id', validate({ params: packageIdParamsSchema }), controller.getPublicById);

  return router;
};
