import { Router } from 'express';
import { createCreatorRouter } from '../modules/creators/creator.routes.js';
import type { CreatorRepository } from '../modules/creators/creator.repository.js';
import { createHealthRouter } from '../modules/health/health.routes.js';

export interface AppDependencies {
  readonly creatorRepository: CreatorRepository;
}

/**
 * API v1 — mount route của từng module tại đây.
 * Module mới (bookings, packages, brands...) thêm một dòng mount tương ứng.
 */
export const createV1Router = (deps: AppDependencies): Router => {
  const router = Router();

  router.use('/health', createHealthRouter());
  router.use('/creators', createCreatorRouter(deps.creatorRepository));

  return router;
};
