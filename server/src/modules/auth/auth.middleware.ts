import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../../shared/errors/api-error.js';
import type { UserRepository } from '../users/user.repository.js';
import type { UserRole } from '../users/user.types.js';
import { verifyAccessToken, type AccessTokenPayload } from './token.service.js';

const AUTH_USER_KEY = 'authUser';

export const getAuthUser = (res: Response): AccessTokenPayload =>
  res.locals[AUTH_USER_KEY] as AccessTokenPayload;

/** Bắt buộc có access token hợp lệ; payload gắn vào res.locals cho controller. */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) {
    next(ApiError.unauthorized());
    return;
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    next(ApiError.unauthorized('Phiên đăng nhập hết hạn hoặc không hợp lệ.'));
    return;
  }

  res.locals[AUTH_USER_KEY] = payload;
  next();
};

/** RBAC theo role (AUTH-005) — dùng SAU requireAuth. */
export const requireRole =
  (...allowedRoles: readonly UserRole[]) =>
  (_req: Request, res: Response, next: NextFunction): void => {
    const authUser = getAuthUser(res);
    if (!authUser || !allowedRoles.includes(authUser.role)) {
      next(ApiError.forbidden());
      return;
    }
    next();
  };

/**
 * AUTH-002: chặn hành động giao dịch khi email chưa xác minh — dùng SAU requireAuth.
 * Áp cho submit hồ sơ, publish package, tạo booking (các module sau tái dùng).
 */
export const requireVerifiedEmail =
  (users: UserRepository) =>
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authUser = getAuthUser(res);
    const user = authUser ? await users.findById(authUser.userId) : null;
    if (!user) {
      next(ApiError.unauthorized());
      return;
    }
    if (!user.emailVerifiedAt) {
      next(
        ApiError.forbidden('Bạn cần xác minh email trước khi thực hiện thao tác này.'),
      );
      return;
    }
    next();
  };
