import { Router } from 'express';
import type { Request, Response } from 'express';
import { ApiError } from '../../shared/errors/api-error.js';
import { sendOk } from '../../shared/http/api-response.js';
import { getValidatedParams, validate } from '../../shared/middlewares/validate.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { getAuthUser } from '../auth/auth.middleware.js';
import { toCreatorPublicDto } from '../creators/creator.mapper.js';
import type { CreatorRepository } from '../creators/creator.repository.js';
import { creatorIdParamsSchema, type CreatorIdParams } from '../creators/creator.validation.js';
import type { FavoriteRepository } from './favorite.repository.js';

export interface FavoriteRouterDeps {
  readonly favoriteRepository: FavoriteRepository;
  readonly creatorRepository: CreatorRepository;
}

/**
 * Creator đã lưu của brand (BRD-006) — danh sách đồng bộ theo account.
 * Chỉ trả creator còn ở trạng thái verified: creator bị gỡ không nên
 * hiện trong danh sách đã lưu.
 */
export const createFavoriteRouter = (deps: FavoriteRouterDeps): Router => {
  const router = Router();

  router.get(
    '/',
    requireAuth,
    requireRole('brand'),
    async (_req: Request, res: Response): Promise<void> => {
      const authUser = getAuthUser(res);
      const ids = await deps.favoriteRepository.listCreatorIds(authUser.userId);
      const creators = await Promise.all(ids.map((id) => deps.creatorRepository.findById(id)));
      const items = creators
        .filter((creator) => creator !== null && creator.status === 'verified')
        .map((creator) => toCreatorPublicDto(creator!));
      sendOk(res, items);
    },
  );

  router.post(
    '/:id',
    requireAuth,
    requireRole('brand'),
    validate({ params: creatorIdParamsSchema }),
    async (_req: Request, res: Response): Promise<void> => {
      const authUser = getAuthUser(res);
      const params = getValidatedParams<CreatorIdParams>(res);
      const creator = await deps.creatorRepository.findById(params.id);
      if (!creator || creator.status !== 'verified') {
        throw ApiError.notFound('Không tìm thấy creator này.');
      }
      await deps.favoriteRepository.add(authUser.userId, params.id);
      sendOk(res, { creatorId: params.id, saved: true });
    },
  );

  router.delete(
    '/:id',
    requireAuth,
    requireRole('brand'),
    validate({ params: creatorIdParamsSchema }),
    async (_req: Request, res: Response): Promise<void> => {
      const authUser = getAuthUser(res);
      const params = getValidatedParams<CreatorIdParams>(res);
      await deps.favoriteRepository.remove(authUser.userId, params.id);
      sendOk(res, { creatorId: params.id, saved: false });
    },
  );

  return router;
};
