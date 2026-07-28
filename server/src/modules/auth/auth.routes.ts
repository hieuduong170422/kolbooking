import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.js';
import type { UserRepository } from '../users/user.repository.js';
import { AuthController } from './auth.controller.js';
import { requireAuth } from './auth.middleware.js';
import { AuthService } from './auth.service.js';
import { loginBodySchema, registerBodySchema } from './auth.validation.js';
import type { SessionRepository } from './session.repository.js';

export const createAuthRouter = (
  users: UserRepository,
  sessions: SessionRepository,
): Router => {
  const controller = new AuthController(new AuthService(users, sessions));
  const router = Router();

  router.post('/register', validate({ body: registerBodySchema }), controller.register);
  router.post('/login', validate({ body: loginBodySchema }), controller.login);
  router.post('/refresh', controller.refresh);
  router.post('/logout', controller.logout);
  router.get('/me', requireAuth, controller.me);

  return router;
};
