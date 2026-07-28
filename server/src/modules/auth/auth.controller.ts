import type { Request, Response } from 'express';
import { ApiError } from '../../shared/errors/api-error.js';
import { sendCreated, sendOk } from '../../shared/http/api-response.js';
import { getValidatedBody } from '../../shared/middlewares/validate.js';
import { getAuthUser } from './auth.middleware.js';
import type { AuthService } from './auth.service.js';
import type { LoginBody, RegisterBody } from './auth.validation.js';
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from './refresh-cookie.js';

/** Response body auth: access token trả trong body, refresh token chỉ nằm trong cookie. */
export class AuthController {
  private readonly service: AuthService;

  constructor(service: AuthService) {
    this.service = service;
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
}
