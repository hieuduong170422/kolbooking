import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ApiError } from '../../shared/errors/api-error.js';
import { validate } from '../../shared/middlewares/validate.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { CreatorPortfolioController } from './creator-portfolio.controller.js';
import { CreatorPortfolioService } from './creator-portfolio.service.js';
import type { CreatorRepository } from './creator.repository.js';
import {
  linkPortfolioItemSchema,
  portfolioItemParamsSchema,
} from './creator-portfolio.validation.js';
import type { FileStorage } from '../../shared/storage/file-storage.js';

/** Multer memoryStorage: file nằm trong bộ nhớ; giới hạn fileSize ≤ 50MB (SEC-005). */
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

/** Chạy multer.single('file'); lỗi MulterError (vd file quá lớn) → ApiError 400. */
const uploadSingleFile = (req: Request, res: Response, next: NextFunction): void => {
  upload.single('file')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      next(ApiError.badRequest(`Lỗi upload file: ${err.message}`));
      return;
    }
    next(err);
  });
};

export interface CreatorPortfolioRouterDeps {
  readonly creatorRepository: CreatorRepository;
  readonly fileStorage: FileStorage;
}

/** Composition tại biên module: repository + fileStorage → service → controller → routes. */
export const createCreatorPortfolioRouter = (deps: CreatorPortfolioRouterDeps): Router => {
  const controller = new CreatorPortfolioController(
    new CreatorPortfolioService(deps.creatorRepository, deps.fileStorage),
  );
  const router = Router();

  // POST /me/portfolio: JSON → validate body link; multipart → upload file rồi xử lý.
  router.post(
    '/me/portfolio',
    requireAuth,
    requireRole('creator'),
    (req, res, next) => {
      if (req.is('application/json')) {
        validate({ body: linkPortfolioItemSchema })(req, res, next);
        return;
      }
      uploadSingleFile(req, res, next);
    },
    controller.addPortfolioItem,
  );

  router.delete(
    '/me/portfolio/:itemId',
    requireAuth,
    requireRole('creator'),
    validate({ params: portfolioItemParamsSchema }),
    controller.removePortfolioItem,
  );

  router.post('/me/avatar', requireAuth, requireRole('creator'), uploadSingleFile, controller.updateAvatar);

  return router;
};
