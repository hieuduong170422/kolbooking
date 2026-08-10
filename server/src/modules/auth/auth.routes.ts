import { Router } from 'express';
import { validate } from '../../shared/middlewares/validate.js';
import type { Mailer } from '../../shared/email/mailer.js';
import type { UserRepository } from '../users/user.repository.js';
import { AuthController } from './auth.controller.js';
import { requireAuth } from './auth.middleware.js';
import { AuthService } from './auth.service.js';
import {
  forgotPasswordBodySchema,
  loginBodySchema,
  registerBodySchema,
  resetPasswordBodySchema,
  verifyEmailBodySchema,
} from './auth.validation.js';
import type { SessionRepository } from './session.repository.js';
import type { VerificationTokenRepository } from './verification.repository.js';
import { VerificationService } from './verification.service.js';

export interface AuthRouterDeps {
  readonly users: UserRepository;
  readonly sessions: SessionRepository;
  readonly verificationTokens: VerificationTokenRepository;
  readonly mailer: Mailer;
}

export const createAuthRouter = (deps: AuthRouterDeps): Router => {
  const verification = new VerificationService(
    deps.users,
    deps.sessions,
    deps.verificationTokens,
    deps.mailer,
  );
  const controller = new AuthController(
    new AuthService(deps.users, deps.sessions, verification),
    verification,
  );
  const router = Router();

  router.post('/register', validate({ body: registerBodySchema }), controller.register);
  router.post('/login', validate({ body: loginBodySchema }), controller.login);
  router.post('/refresh', controller.refresh);
  router.post('/logout', controller.logout);
  router.get('/me', requireAuth, controller.me);

  // AUTH-002: xác minh email bằng OTP.
  router.post('/verify-email/request', requireAuth, controller.requestEmailVerification);
  router.post(
    '/verify-email/confirm',
    requireAuth,
    validate({ body: verifyEmailBodySchema }),
    controller.confirmEmailVerification,
  );

  // AUTH-004: quên mật khẩu / đặt lại bằng OTP — không cần đăng nhập.
  router.post(
    '/password/forgot',
    validate({ body: forgotPasswordBodySchema }),
    controller.forgotPassword,
  );
  router.post(
    '/password/reset',
    validate({ body: resetPasswordBodySchema }),
    controller.resetPassword,
  );

  return router;
};
