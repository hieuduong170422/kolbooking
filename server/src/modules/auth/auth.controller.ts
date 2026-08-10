import type { Request, Response } from 'express';
import { ApiError } from '../../shared/errors/api-error.js';
import { sendCreated, sendOk } from '../../shared/http/api-response.js';
import { getValidatedBody } from '../../shared/middlewares/validate.js';
import { getAuthUser } from './auth.middleware.js';
import type { AuthService } from './auth.service.js';
import type {
  ForgotPasswordBody,
  LoginBody,
  RegisterBody,
  ResetPasswordBody,
  VerifyEmailBody,
} from './auth.validation.js';
import type { VerificationService } from './verification.service.js';
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from './refresh-cookie.js';

/** Response body auth: access token trả trong body, refresh token chỉ nằm trong cookie. */
export class AuthController {
  private readonly service: AuthService;
  private readonly verification: VerificationService;

  constructor(service: AuthService, verification: VerificationService) {
    this.service = service;
    this.verification = verification;
  }

  register = async (_req: Request, res: Response): Promise<void> => {
    const body = getValidatedBody<RegisterBody>(res);
    const result = await this.service.register(body);
    setRefreshCookie(res, result.refreshToken);
    sendCreated(res, { user: result.user, accessToken: result.accessToken });
  };

  login = async (_req: Request, res: Response): Promise<void> => {
    const body = getValidatedBody<LoginBody>(res);
    const result = await this.service.login(body);
    setRefreshCookie(res, result.refreshToken);
    sendOk(res, { user: result.user, accessToken: result.accessToken });
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const refreshToken = readRefreshCookie(req);
    if (!refreshToken) {
      throw ApiError.unauthorized('Không tìm thấy phiên đăng nhập.');
    }
    const result = await this.service.refresh(refreshToken);
    setRefreshCookie(res, result.refreshToken);
    sendOk(res, { user: result.user, accessToken: result.accessToken });
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const refreshToken = readRefreshCookie(req);
    if (refreshToken) {
      await this.service.logout(refreshToken);
    }
    clearRefreshCookie(res);
    sendOk(res, { loggedOut: true });
  };

  me = async (_req: Request, res: Response): Promise<void> => {
    const authUser = getAuthUser(res);
    const user = await this.service.getCurrentUser(authUser.userId);
    sendOk(res, { user });
  };

  requestEmailVerification = async (_req: Request, res: Response): Promise<void> => {
    const authUser = getAuthUser(res);
    await this.verification.requestEmailVerification(authUser.userId);
    sendOk(res, { sent: true });
  };

  confirmEmailVerification = async (_req: Request, res: Response): Promise<void> => {
    const authUser = getAuthUser(res);
    const body = getValidatedBody<VerifyEmailBody>(res);
    const user = await this.verification.confirmEmailVerification(authUser.userId, body.code);
    sendOk(res, { user });
  };

  forgotPassword = async (_req: Request, res: Response): Promise<void> => {
    const body = getValidatedBody<ForgotPasswordBody>(res);
    await this.verification.requestPasswordReset(body.email);
    // Luôn trả 200 — không tiết lộ email có tài khoản hay không.
    sendOk(res, { sent: true });
  };

  resetPassword = async (_req: Request, res: Response): Promise<void> => {
    const body = getValidatedBody<ResetPasswordBody>(res);
    await this.verification.resetPassword(body.email, body.code, body.newPassword);
    sendOk(res, { reset: true });
  };
}
