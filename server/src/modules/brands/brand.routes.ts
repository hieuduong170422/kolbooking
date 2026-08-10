import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ApiError } from '../../shared/errors/api-error.js';
import { validate } from '../../shared/middlewares/validate.js';
import type { FileStorage } from '../../shared/storage/file-storage.js';
import type { AuditRepository } from '../audit/audit.repository.js';
import {
  requireAuth,
  requireRole,
  requireVerifiedEmail,
} from '../auth/auth.middleware.js';
import type { UserRepository } from '../users/user.repository.js';
import { BrandController } from './brand.controller.js';
import type { BrandRepository } from './brand.repository.js';
import { BrandService } from './brand.service.js';
import {
  brandDocParamsSchema,
  brandIdParamsSchema,
  brandProfileBodySchema,
  brandReviewBodySchema,
  brandReviewQueueQuerySchema,
} from './brand.validation.js';

/** Giấy tờ xác minh: ảnh ≤ 10MB (SEC-005) — PDF thêm khi chuyển S3 (P6). */
const MAX_DOC_SIZE_BYTES = 10 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOC_SIZE_BYTES },
});

const uploadSingleFile = (req: Request, res: Response, next: NextFunction): void => {
  upload.single('file')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      next(ApiError.badRequest(`Lỗi upload file: ${err.message}`));
      return;
    }
    next(err);
  });
};

export interface BrandRouterDeps {
  readonly brandRepository: BrandRepository;
  readonly userRepository: UserRepository;
  readonly auditRepository: AuditRepository;
  /** Storage PRIVATE — file KHÔNG được serve qua /uploads công khai (BRD-003). */
  readonly privateFileStorage: FileStorage;
}

/** Composition tại biên module: repository → service → controller → routes. */
export const createBrandRouter = (deps: BrandRouterDeps): Router => {
  const controller = new BrandController(
    new BrandService(
      deps.brandRepository,
      deps.userRepository,
      deps.auditRepository,
      deps.privateFileStorage,
    ),
  );
  const router = Router();

  // Owner (brand) — /me và /reviews PHẢI đứng trước /:id (route ordering).
  router.get('/me', requireAuth, requireRole('brand'), controller.getMe);
  router.put(
    '/me',
    requireAuth,
    requireRole('brand'),
    validate({ body: brandProfileBodySchema }),
    controller.updateMe,
  );
  router.post(
    '/me/documents',
    requireAuth,
    requireRole('brand'),
    uploadSingleFile,
    controller.uploadDocument,
  );
  // AUTH-002: chưa xác minh email thì không gửi duyệt hồ sơ (gate giao dịch).
  router.post(
    '/me/submit-review',
    requireAuth,
    requireRole('brand'),
    requireVerifiedEmail(deps.userRepository),
    controller.submitForReview,
  );

  // Admin queue + duyệt (BRD-007).
  router.get(
    '/reviews',
    requireAuth,
    requireRole('admin'),
    validate({ query: brandReviewQueueQuerySchema }),
    controller.listQueue,
  );
  router.post(
    '/:id/review',
    requireAuth,
    requireRole('admin'),
    validate({ params: brandIdParamsSchema, body: brandReviewBodySchema }),
    controller.review,
  );

  // File giấy tờ private — RBAC trong service: chỉ admin hoặc chính chủ (BRD-003).
  router.get(
    '/:id/documents/:docId',
    requireAuth,
    validate({ params: brandDocParamsSchema }),
    controller.getDocument,
  );

  return router;
};
