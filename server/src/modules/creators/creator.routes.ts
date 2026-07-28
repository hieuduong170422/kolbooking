import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.js';
import { CreatorController } from './creator.controller.js';
import type { CreatorRepository } from './creator.repository.js';
import { CreatorService } from './creator.service.js';
import { creatorIdParamsSchema, creatorListQuerySchema } from './creator.validation.js';

/** Composition tại biên module: repository → service → controller → routes. */
export const createCreatorRouter = (repository: CreatorRepository): Router => {
  const controller = new CreatorController(new CreatorService(repository));
  const router = Router();

  router.get('/', validate({ query: creatorListQuerySchema }), controller.list);
  router.get('/:id', validate({ params: creatorIdParamsSchema }), controller.getById);

  return router;
};
